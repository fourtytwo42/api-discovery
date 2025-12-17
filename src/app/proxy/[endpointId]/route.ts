import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { validateProxyUrl } from '@/lib/proxy/validation';
import { NotFoundError, handleError } from '@/lib/utils/errors';
import { Prisma } from '@prisma/client';

// This route handles the root proxy URL (e.g., /proxy/[endpointId])
// It serves as a web proxy that renders the destination site
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  try {
    const { endpointId } = await params;

    // Get endpoint
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
    });

    if (!endpoint) {
      throw new NotFoundError('Endpoint');
    }

    if (endpoint.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Endpoint is not active' },
        { status: 410 }
      );
    }

    // Validate destination URL
    const urlValidation = validateProxyUrl(endpoint.destinationUrl);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error || 'Invalid destination URL' },
        { status: 400 }
      );
    }

    // Update last used timestamp
    await prisma.endpoint.update({
      where: { id: endpointId },
      data: { lastUsedAt: new Date() },
    });

    // Fetch the destination page
    const startTime = Date.now();
    try {
      const response = await fetch(endpoint.destinationUrl, {
        headers: {
          'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
          'Accept': request.headers.get('Accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': request.headers.get('Accept-Language') || 'en-US,en;q=0.9',
        },
      });

      const html = await response.text();
      const contentType = response.headers.get('Content-Type') || 'text/html';

      // If it's HTML, rewrite URLs to go through proxy
      if (contentType.includes('text/html')) {
        const proxyBase = `/proxy/${endpointId}`;
        const destinationBase = new URL(endpoint.destinationUrl).origin;
        
        // Inject base tag to make relative URLs resolve through proxy
        // This ensures favicon.ico, logo.png, etc. are requested through the proxy
        const baseTag = `<base href="${proxyBase}/">`;
        let htmlWithBase = html;
        if (html.includes('<head>')) {
          htmlWithBase = html.replace('<head>', `<head>${baseTag}`);
        } else if (html.includes('<html>')) {
          htmlWithBase = html.replace('<html>', `<html><head>${baseTag}</head>`);
        } else {
          // If no head tag, prepend it
          htmlWithBase = `<head>${baseTag}</head>${html}`;
        }
        
        // Rewrite URLs in HTML
        const rewrittenHtml = rewriteHtmlUrls(htmlWithBase, destinationBase, proxyBase);

        // Inject JavaScript to intercept API calls
        // Add a small inline script first to ensure interceptor runs immediately
        const immediateScript = `<script>
          console.log('[API Discovery Proxy] Interceptor script loading...');
          if (typeof window !== 'undefined') {
            console.log('[API Discovery Proxy] Window available, ready to intercept');
          }
        </script>`;
        const injectedHtml = injectApiInterceptor(immediateScript + rewrittenHtml, endpointId);

        const nextResponse = new NextResponse(injectedHtml, {
          status: response.status,
          headers: {
            'Content-Type': 'text/html',
            'X-Proxy-For': endpoint.destinationUrl,
          },
        });
        
        // Set cookie to track active proxy session for asset requests
        // This allows middleware to redirect root-level assets to the proxy
        nextResponse.cookies.set('active-proxy-endpoint', endpointId, {
          httpOnly: false, // Needs to be accessible to JavaScript for some cases
          secure: false, // Set to false for development (localhost)
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        });
        
        return nextResponse;
      }

      // For non-HTML content, return as-is
      return new NextResponse(html, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
        },
      });
    } catch (fetchError) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch destination page', 
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error' 
        },
        { status: 502 }
      );
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    const handled = handleError(error);
    return NextResponse.json(
      { error: handled.message },
      { status: handled.statusCode }
    );
  }
}

function rewriteHtmlUrls(html: string, destinationBase: string, proxyBase: string): string {
  const destinationOrigin = new URL(destinationBase).origin;
  
  // Rewrite absolute URLs in href attributes
  html = html.replace(
    new RegExp(`(href=["'])(${escapeRegex(destinationOrigin)})([^"']*)(["'])`, 'gi'),
    (match, prefix, origin, path, suffix) => {
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );

  // Rewrite absolute URLs in src attributes
  html = html.replace(
    new RegExp(`(src=["'])(${escapeRegex(destinationOrigin)})([^"']*)(["'])`, 'gi'),
    (match, prefix, origin, path, suffix) => {
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );

  // Rewrite relative URLs (starting with /)
  html = html.replace(
    /(href=["'])(\/[^"']*)(["'])/gi,
    (match, prefix, path, suffix) => {
      // Skip if it's already a proxy URL or external URL
      if (path.startsWith('/proxy/') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
        return match;
      }
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );

  html = html.replace(
    /(src=["'])(\/[^"']*)(["'])/gi,
    (match, prefix, path, suffix) => {
      // Skip if it's already a proxy URL or external URL
      if (path.startsWith('/proxy/') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
        return match;
      }
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );

  // Rewrite favicon links (various formats)
  html = html.replace(
    /(<link[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["'])(\/[^"']*)(["'])/gi,
    (match, prefix, path, suffix) => {
      if (path.startsWith('/proxy/') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
        return match;
      }
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );
  
  // Rewrite favicon in absolute URLs
  html = html.replace(
    new RegExp(`(<link[^>]*rel=["'](?:shortcut\\s+)?icon["'][^>]*href=["'])(${escapeRegex(destinationOrigin)})([^"']*)(["'])`, 'gi'),
    (match, prefix, origin, path, suffix) => {
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );
  
  // Rewrite apple-touch-icon and other icon types
  html = html.replace(
    /(<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*href=["'])(\/[^"']*)(["'])/gi,
    (match, prefix, path, suffix) => {
      if (path.startsWith('/proxy/') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
        return match;
      }
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );

  // Rewrite URLs in style attributes (including background-image)
  html = html.replace(
    new RegExp(`(style=["'][^"']*url\\(["']?)(${escapeRegex(destinationOrigin)})([^"']*)(["']?\\))`, 'gi'),
    (match, prefix, origin, path, suffix) => {
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );
  
  // Rewrite relative URLs in style attributes (background-image, etc.)
  html = html.replace(
    /(style=["'][^"']*url\\(["']?)(\/[^"']*)(["']?\\))/gi,
    (match, prefix, path, suffix) => {
      if (path.startsWith('/proxy/') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//') || path.startsWith('data:')) {
        return match;
      }
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );

  // Rewrite URLs in CSS @import
  html = html.replace(
    new RegExp(`(@import\\s+["'])(${escapeRegex(destinationOrigin)})([^"']*)(["'])`, 'gi'),
    (match, prefix, origin, path, suffix) => {
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );

  // Rewrite fetch/API URLs in script tags
  html = html.replace(
    new RegExp(`(fetch\\(["'])(${escapeRegex(destinationOrigin)})([^"']*)(["'])`, 'gi'),
    (match, prefix, origin, path, suffix) => {
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );

  // Rewrite XMLHttpRequest URLs
  html = html.replace(
    new RegExp(`(open\\(["'])(GET|POST|PUT|DELETE|PATCH)["'],\\s*["'](${escapeRegex(destinationOrigin)})([^"']*)(["'])`, 'gi'),
    (match, prefix, method, origin, path, suffix) => {
      return `${prefix}${method}", "${proxyBase}${path}${suffix}`;
    }
  );

  // Rewrite WebSocket URLs (ws:// and wss://)
  html = html.replace(
    new RegExp(`(ws://|wss://)(${escapeRegex(destinationOrigin.replace(/^https?:/, ''))})([^"']*)`, 'gi'),
    (match, protocol, origin, path) => {
      // Convert to our WebSocket proxy URL
      // Extract endpointId from proxyBase (format: /proxy/[endpointId])
      const endpointId = proxyBase.replace('/proxy/', '');
      const wsHost = typeof window !== 'undefined' 
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
        : 'ws://localhost:3001';
      return `${wsHost}/ws-proxy${path}?endpointId=${endpointId}`;
    }
  );

  // Also rewrite in JavaScript code (new WebSocket(...))
  html = html.replace(
    new RegExp(`(new\\s+WebSocket\\s*\\(\\s*["'])(ws://|wss://)(${escapeRegex(destinationOrigin.replace(/^https?:/, ''))})([^"']*)(["'])`, 'gi'),
    (match, prefix, protocol, origin, path, suffix) => {
      const endpointId = proxyBase.replace('/proxy/', '');
      const wsHost = typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
        : 'ws://localhost:3001';
      return `${prefix}${wsHost}/ws-proxy${path}?endpointId=${endpointId}${suffix}`;
    }
  );

  return html;
}

function rewriteCssUrls(css: string, destinationOrigin: string, proxyBase: string): string {
  // Rewrite URLs in url() functions
  css = css.replace(
    new RegExp(`(url\\(["']?)(${escapeRegex(destinationOrigin)})([^"']*)(["']?\\))`, 'gi'),
    (match, prefix, origin, path, suffix) => {
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );

  // Rewrite relative URLs in url()
  css = css.replace(
    /(url\\(["']?)(\/[^"']*)(["']?\\))/gi,
    (match, prefix, path, suffix) => {
      if (path.startsWith('/proxy/') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//') || path.startsWith('data:')) {
        return match;
      }
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );

  // Rewrite @import URLs
  css = css.replace(
    new RegExp(`(@import\\s+["'])(${escapeRegex(destinationOrigin)})([^"']*)(["'])`, 'gi'),
    (match, prefix, origin, path, suffix) => {
      return `${prefix}${proxyBase}${path}${suffix}`;
    }
  );

  return css;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function injectApiInterceptor(html: string, endpointId: string): string {
  // Escape endpointId to prevent injection issues
  const escapedEndpointId = endpointId.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
  const interceptorScript = `
<script>
(function() {
  const endpointId = '${escapedEndpointId}';
  const proxyBase = '/proxy/' + endpointId;
  
  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (!options) options = {};
    let proxiedUrl = url;
    if (typeof url === 'string') {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Absolute URL - check if it's the destination
        try {
          const urlObj = new URL(url);
          // Log external API calls
          logApiCall(url, options.method || 'GET', options.body, options.headers);
        } catch (e) {
          // Invalid URL, pass through
        }
      } else {
        // Relative URL - needs to be proxied (including images, favicons, etc.)
        // Rewrite to go through our proxy
        const relativePath = url.startsWith('/') ? url : '/' + url;
        proxiedUrl = proxyBase + relativePath;
        // Only log non-asset and non-Cloudflare requests
        const urlLower = url.toLowerCase();
        const isAsset = /\.(css|js|woff|woff2|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|mp4|mp3|pdf|map)$/i.test(urlLower);
        const isCloudflare = urlLower.includes('/cdn-cgi/') ||
                             urlLower.includes('cloudflare') ||
                             urlLower.includes('cf-');
        if (!isAsset && !isCloudflare) {
          logApiCall(proxiedUrl, options.method || 'GET', options.body, options.headers);
        }
      }
    }
    
    // Use the proxied URL if we rewrote it
    return originalFetch.call(this, proxiedUrl, options);
  };
  
  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._method = method;
    this._originalUrl = url;
    
    // Get additional arguments (async, user, password) if provided
    var args = Array.prototype.slice.call(arguments, 2);
    
    // Rewrite relative URLs to go through proxy
    let proxiedUrl = url;
    if (typeof url === 'string' && !url.startsWith('http://') && !url.startsWith('https://')) {
      const relativePath = url.startsWith('/') ? url : '/' + url;
      proxiedUrl = proxyBase + relativePath;
      // Only log non-asset and non-Cloudflare requests
      const urlLower = url.toLowerCase();
      const isAsset = /\.(css|js|woff|woff2|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|mp4|mp3|pdf|map)$/i.test(urlLower);
      const isCloudflare = urlLower.includes('/cdn-cgi/') ||
                           urlLower.includes('cloudflare') ||
                           urlLower.includes('cf-');
      if (!isAsset && !isCloudflare) {
        logApiCall(proxiedUrl, method, null, {});
      }
    } else {
      // Only log non-asset and non-Cloudflare requests for absolute URLs
      const urlLower = url.toLowerCase();
      const isAsset = /\.(css|js|woff|woff2|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|mp4|mp3|pdf|map)$/i.test(urlLower);
      const isCloudflare = urlLower.includes('/cdn-cgi/') ||
                           urlLower.includes('cloudflare') ||
                           urlLower.includes('cf-');
      if (!isAsset && !isCloudflare) {
        logApiCall(url, method, null, {});
      }
    }
    
    this._url = proxiedUrl;
    // Call originalOpen with method, proxiedUrl, and any additional arguments
    return originalOpen.apply(this, [method, proxiedUrl].concat(args));
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    if (this._url) {
      // Only log non-asset and non-Cloudflare requests
      const urlLower = this._url.toLowerCase();
      const isAsset = /\.(css|js|woff|woff2|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|mp4|mp3|pdf|map)$/i.test(urlLower);
      const isCloudflare = urlLower.includes('/cdn-cgi/') ||
                           urlLower.includes('cloudflare') ||
                           urlLower.includes('cf-');
      if (!isAsset && !isCloudflare) {
        logApiCall(this._url, this._method || 'GET', body, {});
      }
    }
    return originalSend.apply(this, arguments);
  };
  
  // Intercept WebSocket connections - MUST run before page scripts
  // Intercept ALL WebSocket connections, regardless of destination
  const originalWebSocket = window.WebSocket;
  console.log('[API Discovery Proxy] Installing WebSocket interceptor, original WebSocket:', originalWebSocket);
  
  // Create a wrapper function that intercepts all WebSocket creation
  const WebSocketProxy = function(url, protocols) {
    console.log('[API Discovery Proxy] WebSocket constructor called:', url, protocols, 'type:', typeof url);
    
    try {
      let targetUrl;
      
      // Handle both string URLs and URL objects
      if (typeof url === 'string') {
        if (url.startsWith('ws://') || url.startsWith('wss://')) {
          // Absolute WebSocket URL
          targetUrl = url;
        } else if (url.startsWith('/')) {
          // Relative URL starting with / - construct from current page origin
          // Get the original destination from the page (it should be proxied, so we need to infer)
          // For relative URLs, we'll construct based on the current page's origin
          // Since we're proxying, the original destination should be in the referer or we can use a fallback
          const currentProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          // Try to get original host from document.referrer or use current host as fallback
          let originalHost = window.location.hostname;
          try {
            const referer = document.referrer;
            if (referer) {
              const refererUrl = new URL(referer);
              // If referer is our proxy, we need to get the original destination
              // For now, use a heuristic: if it's a known domain pattern, use it
              // Otherwise, construct from the current proxy context
              originalHost = refererUrl.hostname;
            }
          } catch (e) {
            // Ignore referer parsing errors
          }
          targetUrl = currentProtocol + '//' + originalHost + url;
        } else {
          // Relative URL without leading slash - treat as path
          const currentProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          let originalHost = window.location.hostname;
          try {
            const referer = document.referrer;
            if (referer) {
              const refererUrl = new URL(referer);
              originalHost = refererUrl.hostname;
            }
          } catch (e) {
            // Ignore
          }
          targetUrl = currentProtocol + '//' + originalHost + '/' + url;
        }
      } else if (url instanceof URL) {
        // URL object - convert to string
        targetUrl = url.href;
      } else {
        // Unknown type - try to convert to string
        targetUrl = String(url);
      }
      
      // Parse the target URL to get components
      const urlObj = new URL(targetUrl);
      const fullPath = urlObj.pathname + (urlObj.search || '');
      
      // Rewrite to use our WebSocket proxy
      // Use the same host but port 3001 for WebSocket server
      var wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      var wsHost = wsProtocol + '//' + window.location.hostname + ':3001';
      // Pass the original URL as a query parameter so our proxy knows where to connect
      var querySeparator = urlObj.search ? '&' : '?';
      var proxiedUrl = wsHost + '/ws-proxy' + fullPath + querySeparator + 'endpointId=' + endpointId + '&originalUrl=' + encodeURIComponent(targetUrl);
      console.log('[API Discovery Proxy] Proxying WebSocket:', url, '->', proxiedUrl, '(target:', targetUrl + ')');
      const ws = new originalWebSocket(proxiedUrl, protocols);
      
      // Log WebSocket events for debugging
      ws.addEventListener('open', function() {
        console.log('[API Discovery Proxy] WebSocket opened successfully:', proxiedUrl, 'target:', targetUrl);
      });
      ws.addEventListener('error', function(e) {
        console.error('[API Discovery Proxy] WebSocket error:', e, 'proxiedUrl:', proxiedUrl, 'target:', targetUrl);
        console.error('[API Discovery Proxy] WebSocket error details:', {
          readyState: ws.readyState,
          url: ws.url,
          protocol: ws.protocol,
        });
      });
      ws.addEventListener('close', function(e) {
        console.log('[API Discovery Proxy] WebSocket closed:', {
          code: e.code,
          reason: e.reason,
          wasClean: e.wasClean,
          proxiedUrl: proxiedUrl,
          target: targetUrl,
        });
      });
      
      return ws;
    } catch (e) {
      console.error('[API Discovery Proxy] Failed to proxy WebSocket URL:', e, 'url:', url, 'stack:', e instanceof Error ? e.stack : 'no stack');
      // Fall back to original if rewriting fails
      try {
        return new originalWebSocket(url, protocols);
      } catch (fallbackError) {
        console.error('[API Discovery Proxy] Fallback WebSocket creation also failed:', fallbackError);
        throw fallbackError;
      }
    }
  };
  
  // Preserve WebSocket static properties and prototype
  Object.setPrototypeOf(WebSocketProxy, originalWebSocket);
  Object.setPrototypeOf(WebSocketProxy.prototype, originalWebSocket.prototype);
  
  // Copy static properties
  Object.getOwnPropertyNames(originalWebSocket).forEach(function(prop) {
    if (prop !== 'prototype' && prop !== 'length' && prop !== 'name') {
      try {
        WebSocketProxy[prop] = originalWebSocket[prop];
      } catch (e) {
        // Ignore read-only properties
      }
    }
  });
  
  // Replace window.WebSocket
  window.WebSocket = WebSocketProxy;
  
  console.log('[API Discovery Proxy] WebSocket interceptor installed successfully, window.WebSocket:', window.WebSocket);
  
  // Throttle logging to prevent excessive API calls
  let lastLogTime = 0;
  const LOG_THROTTLE_MS = 1000; // Only log once per second max
  const loggedUrls = new Set();
  const MAX_LOGGED_URLS = 100; // Keep track of recent URLs to avoid duplicates
  
  function logApiCall(url, method, body, headers) {
    try {
      const now = Date.now();
      
      // Throttle: only log once per second
      if (now - lastLogTime < LOG_THROTTLE_MS) {
        return;
      }
      
      // Skip logging for asset requests and Cloudflare endpoints
      const urlLower = (url || '').toLowerCase();
      const isAsset = /\.(css|js|woff|woff2|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|mp4|mp3|pdf|map|woff2)$/i.test(urlLower) ||
                      urlLower.includes('/_next/') ||
                      urlLower.includes('/static/') ||
                      urlLower.includes('/assets/') ||
                      urlLower.includes('/images/') ||
                      urlLower.includes('/fonts/') ||
                      urlLower.includes('/favicon') ||
                      urlLower.includes('/analytics') ||
                      urlLower.includes('/tracking') ||
                      urlLower.includes('/beacon') ||
                      urlLower.includes('/pixel') ||
                      urlLower.includes('/gtm') ||
                      urlLower.includes('/ga/') ||
                      urlLower.includes('/google-analytics');
      
      // Skip Cloudflare-specific endpoints (challenge, rum, etc.)
      const isCloudflare = urlLower.includes('/cdn-cgi/') ||
                           urlLower.includes('cloudflare') ||
                           urlLower.includes('cf-');
      
      if (isAsset || isCloudflare) {
        return; // Skip logging assets and Cloudflare endpoints
      }
      
      // Skip if we've already logged this exact URL recently
      const urlKey = method + ':' + url;
      if (loggedUrls.has(urlKey)) {
        return;
      }
      
      // Clean up old URLs if set gets too large
      if (loggedUrls.size > MAX_LOGGED_URLS) {
        const firstUrl = loggedUrls.values().next().value;
        loggedUrls.delete(firstUrl);
      }
      loggedUrls.add(urlKey);
      
      // Only log API calls to external domains (not same-origin)
      try {
        const urlObj = new URL(url, window.location.href);
        const isSameOrigin = urlObj.origin === window.location.origin;
        // Skip same-origin requests (they're already handled by the proxy)
        if (isSameOrigin && !url.includes('/api/')) {
          return;
        }
      } catch (e) {
        // If URL parsing fails, skip it
        return;
      }
      
      // Update last log time
      lastLogTime = now;
      
      // Truncate body if it's too large (max 5KB for logging to reduce memory)
      let truncatedBody = body;
      if (typeof body === 'string' && body.length > 5000) {
        truncatedBody = body.substring(0, 5000) + '... [truncated]';
      } else if (body && typeof body === 'object') {
        try {
          const bodyStr = JSON.stringify(body);
          if (bodyStr.length > 5000) {
            truncatedBody = bodyStr.substring(0, 5000) + '... [truncated]';
          } else {
            truncatedBody = bodyStr;
          }
        } catch (e) {
          // If stringify fails (circular reference, too large, etc.), skip body
          truncatedBody = '[body too large or invalid to serialize]';
        }
      }
      
      // Truncate headers if needed (max 2KB)
      let truncatedHeaders = headers;
      if (headers && typeof headers === 'object') {
        try {
          const headersStr = JSON.stringify(headers);
          if (headersStr.length > 2000) {
            truncatedHeaders = JSON.parse(headersStr.substring(0, 2000) + '... [truncated]');
          }
        } catch (e) {
          truncatedHeaders = {};
        }
      }
      
      // Send to our API to log the call (fire and forget, don't wait)
      fetch('/api/v1/proxy/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointId: endpointId,
          url: url,
          method: method,
          body: truncatedBody,
          headers: truncatedHeaders,
          timestamp: new Date().toISOString()
        }),
        // Don't wait for response to avoid blocking
        keepalive: true
      }).catch(() => {
        // Silently fail - don't log errors to avoid infinite loops
      });
    } catch (err) {
      // Silently fail - don't log errors to avoid infinite loops
    }
  }
})();
</script>
`;

      // Inject as early as possible - in <head> before any scripts run
      // This ensures our interceptor is set up before the page's JavaScript executes
      // Try multiple injection points to ensure it works
      if (html.includes('</head>')) {
        return html.replace('</head>', interceptorScript + '</head>');
      } else if (html.includes('<head>')) {
        return html.replace('<head>', '<head>' + interceptorScript);
      } else if (html.includes('<html>')) {
        return html.replace('<html>', '<html><head>' + interceptorScript + '</head>');
      } else if (html.includes('</body>')) {
        return html.replace('</body>', interceptorScript + '</body>');
      } else {
        // If no head or body, prepend to HTML
        return interceptorScript + html;
      }
}

