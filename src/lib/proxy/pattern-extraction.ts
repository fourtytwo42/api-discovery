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

/**
 * Normalize URL to pattern by replacing dynamic IDs with :param
 * Examples:
 * /api/users/123 -> /api/users/:id
 * /api/products/a1b2c3d4-e5f6-7890-1234-567890abcdef -> /api/products/:id
 * /api/tokens/7Tx8qTXSakpfaSFjdztPGQ9n2uyT1eUkYz7gYxxopump/metadata -> /api/tokens/:id/metadata
 */
export function normalizeUrlPattern(url: string): string {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname;

    // Remove trailing slash for consistent patterns, unless it's the root path
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    // Replace UUIDs (e.g., a1b2c3d4-e5f6-7890-1234-567890abcdef) with :id
    path = path.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id'
    );

    // Replace CUIDs (e.g., clx01z000000008l400000000) with :id
    path = path.replace(/cl[a-z0-9]{25}/g, ':id');

    // Replace numeric IDs (e.g., /123, /users/456/posts) with :id
    // Ensure it's a full path segment to avoid replacing parts of words
    path = path.replace(/\/\d+(\/|$)/g, '/:id$1');
    // Handle numeric ID at the very end of the path
    path = path.replace(/\/\d+$/, '/:id');

    // Replace long hexadecimal strings (e.g., Solana token addresses, Ethereum hashes) with :id
    // This regex looks for segments that are purely hex characters and are reasonably long (e.g., 20+ chars)
    path = path.replace(/\/[0-9a-fA-F]{20,}(\/|$)/g, '/:id$1');
    path = path.replace(/\/[0-9a-fA-F]{20,}$/g, '/:id');

    return path;
  } catch (e) {
    // If URL parsing fails (e.g., malformed URL), return the original URL
    console.warn('Failed to normalize URL pattern:', url, e);
    return url;
  }
}

