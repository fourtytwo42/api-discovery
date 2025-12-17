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
  
  // Intercept WebSocket connections
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    // If URL contains ws:// or wss://, rewrite it to use our proxy
    if (typeof url === 'string' && (url.startsWith('ws://') || url.startsWith('wss://'))) {
      try {
        const urlObj = new URL(url);
        // Extract path and query
        const path = urlObj.pathname + urlObj.search;
        // Rewrite to use our WebSocket proxy
        // Use the same host but port 3001 for WebSocket server
        const wsHost = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.hostname + ':3001';
        const proxiedUrl = wsHost + '/ws-proxy' + path + (urlObj.search ? '&' : '?') + 'endpointId=' + endpointId;
        console.log('Proxying WebSocket:', url, '->', proxiedUrl);
        return new originalWebSocket(proxiedUrl, protocols);
      } catch (e) {
        console.error('Failed to proxy WebSocket URL:', e);
        // Fall back to original if rewriting fails
        return new originalWebSocket(url, protocols);
      }
    }
    return new originalWebSocket(url, protocols);
  };
  
  function logApiCall(url, method, body, headers) {
    // Send to our API to log the call
    fetch('/api/v1/proxy/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpointId: endpointId,
        url: url,
        method: method,
        body: body,
        headers: headers,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Failed to log API call:', err));
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

