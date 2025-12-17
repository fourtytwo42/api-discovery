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
        
        // Rewrite URLs in HTML
        const rewrittenHtml = rewriteHtmlUrls(html, destinationBase, proxyBase);

        // Inject JavaScript to intercept API calls
        const injectedHtml = injectApiInterceptor(rewrittenHtml, endpointId);

        return new NextResponse(injectedHtml, {
          status: response.status,
          headers: {
            'Content-Type': 'text/html',
            'X-Proxy-For': endpoint.destinationUrl,
          },
        });
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

  // Rewrite URLs in style attributes
  html = html.replace(
    new RegExp(`(style=["'][^"']*url\\(["']?)(${escapeRegex(destinationOrigin)})([^"']*)(["']?\\))`, 'gi'),
    (match, prefix, origin, path, suffix) => {
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
  const interceptorScript = `
<script>
(function() {
  const endpointId = '${endpointId}';
  const proxyBase = '/proxy/' + endpointId;
  
  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    // If it's a relative URL or same origin, proxy it
    let proxiedUrl = url;
    if (typeof url === 'string') {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Absolute URL - check if it's the destination
        try {
          const urlObj = new URL(url);
          // For now, log all external API calls
          logApiCall(url, options.method || 'GET', options.body, options.headers);
        } catch (e) {
          // Invalid URL, pass through
        }
      } else {
        // Relative URL - already proxied by HTML rewriting
        logApiCall(proxyBase + (url.startsWith('/') ? url : '/' + url), options.method || 'GET', options.body, options.headers);
      }
    }
    
    return originalFetch.apply(this, arguments);
  };
  
  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, [method, url, ...args]);
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    if (this._url) {
      logApiCall(this._url, this._method || 'GET', body, {});
    }
    return originalSend.apply(this, arguments);
  };
  
  // Intercept WebSocket connections - MUST run before page scripts
  // Intercept ALL WebSocket connections, regardless of destination
  const originalWebSocket = window.WebSocket;
  console.log('[API Discovery Proxy] Installing WebSocket interceptor, original WebSocket:', originalWebSocket);
  
  window.WebSocket = function(url, protocols) {
    console.log('[API Discovery Proxy] WebSocket constructor called:', url, protocols);
    
    // Intercept ALL WebSocket connections (ws:// or wss://)
    if (typeof url === 'string' && (url.startsWith('ws://') || url.startsWith('wss://'))) {
      try {
        const urlObj = new URL(url);
        // Extract the full path including query string
        const fullPath = urlObj.pathname + (urlObj.search || '');
        
        // Rewrite to use our WebSocket proxy
        // Use the same host but port 3001 for WebSocket server
        const wsHost = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.hostname + ':3001';
        // Pass the original URL as a query parameter so our proxy knows where to connect
        const proxiedUrl = wsHost + '/ws-proxy' + fullPath + (urlObj.search ? '&' : '?') + 'endpointId=' + endpointId + '&originalUrl=' + encodeURIComponent(url);
        console.log('[API Discovery Proxy] Proxying WebSocket:', url, '->', proxiedUrl);
        const ws = new originalWebSocket(proxiedUrl, protocols);
        
        // Log WebSocket events for debugging
        ws.addEventListener('open', () => console.log('[API Discovery Proxy] WebSocket opened:', proxiedUrl));
        ws.addEventListener('error', (e) => console.error('[API Discovery Proxy] WebSocket error:', e, proxiedUrl));
        ws.addEventListener('close', (e) => console.log('[API Discovery Proxy] WebSocket closed:', e.code, e.reason));
        
        return ws;
      } catch (e) {
        console.error('[API Discovery Proxy] Failed to proxy WebSocket URL:', e, url);
        // Fall back to original if rewriting fails
        return new originalWebSocket(url, protocols);
      }
    }
    
    // For non-ws URLs, pass through (but log it)
    console.log('[API Discovery Proxy] Passing through non-WebSocket URL:', url);
    return new originalWebSocket(url, protocols);
  };
  
  // Preserve WebSocket static properties and prototype
  Object.setPrototypeOf(window.WebSocket, originalWebSocket);
  Object.setPrototypeOf(window.WebSocket.prototype, originalWebSocket.prototype);
  
  // Copy static properties
  Object.getOwnPropertyNames(originalWebSocket).forEach(prop => {
    if (prop !== 'prototype' && prop !== 'length' && prop !== 'name') {
      try {
        window.WebSocket[prop] = originalWebSocket[prop];
      } catch (e) {
        // Ignore read-only properties
      }
    }
  });
  
  console.log('[API Discovery Proxy] WebSocket interceptor installed successfully');
  
  function logApiCall(url, method, body, headers) {
    try {
      // Skip logging for asset requests to reduce memory usage
      const urlLower = (url || '').toLowerCase();
      const isAsset = /\.(css|js|woff|woff2|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|mp4|mp3|pdf|map|woff2)$/i.test(urlLower) ||
                      urlLower.includes('/_next/') ||
                      urlLower.includes('/static/') ||
                      urlLower.includes('/assets/') ||
                      urlLower.includes('/images/') ||
                      urlLower.includes('/fonts/');
      
      if (isAsset) {
        return; // Skip logging assets
      }
      
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
  if (html.includes('</head>')) {
    return html.replace('</head>', interceptorScript + '</head>');
  } else if (html.includes('<head>')) {
    return html.replace('<head>', '<head>' + interceptorScript);
  } else if (html.includes('</body>')) {
    return html.replace('</body>', interceptorScript + '</body>');
  } else {
    // If no head or body, prepend to HTML
    return interceptorScript + html;
  }
}

