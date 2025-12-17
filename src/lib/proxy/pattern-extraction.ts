/**
 * Extract endpoint patterns from URLs
 * Normalizes URLs to patterns like /api/users/:id
 */

export function extractEndpointPattern(url: string, method: string): string {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;

    // Remove query string and hash
    // pathname already doesn't include these

    // Normalize common patterns:
    // - UUIDs: /api/users/123e4567-e89b-12d3-a456-426614174000 -> /api/users/:id
    // - CUIDs: /api/tokens/clx1234567890 -> /api/tokens/:id
    // - Numbers: /api/users/123 -> /api/users/:id
    // - Hex strings: /api/tokens/7Tx8qTXSakpfaSFjdztPGQ9n2uyT1eUkYz7gYxxopump -> /api/tokens/:id

    // Pattern for UUIDs
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    pathname = pathname.replace(uuidPattern, ':id');

    // Pattern for CUIDs (typically start with 'c' followed by lowercase letters and numbers)
    const cuidPattern = /\/c[a-z0-9]{24,25}/gi;
    pathname = pathname.replace(cuidPattern, '/:id');

    // Pattern for long hex/alphanumeric strings (like token addresses)
    // Match segments that are 20+ alphanumeric characters
    const longHexPattern = /\/[a-zA-Z0-9]{20,}/g;
    pathname = pathname.replace(longHexPattern, '/:id');

    // Pattern for numeric IDs
    const numericPattern = /\/\d+/g;
    pathname = pathname.replace(numericPattern, '/:id');

    // Remove trailing slashes (except root)
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Combine method and path for unique identification
    return `${method.toUpperCase()} ${pathname}`;
  } catch (e) {
    // If URL parsing fails, return method + path as-is
    return `${method.toUpperCase()} ${url}`;
  }
}

export function normalizeUrlForGrouping(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + (urlObj.search || '');
  } catch (e) {
    // If URL parsing fails, try to extract path manually
    const match = url.match(/^https?:\/\/[^\/]+(\/[^?#]*)/);
    return match ? match[1] : url;
  }
}

