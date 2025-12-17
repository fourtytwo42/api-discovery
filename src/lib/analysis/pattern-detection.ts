export interface ApiPatterns {
  authRequired: boolean;
  authType?: string;
  paginationType?: string;
  apiType?: string;
  corsConfig?: Record<string, string>;
}

/**
 * Detect API patterns from captured calls
 */
export function detectPatterns(apiCalls: Array<{
  method: string;
  requestHeaders: Record<string, unknown>;
  responseHeaders: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  responseStatus?: number;
}>): ApiPatterns {
  const patterns: ApiPatterns = {
    authRequired: false,
  };

  // Detect authentication
  for (const call of apiCalls) {
    const authHeader = Object.keys(call.requestHeaders).find(
      (key) => key.toLowerCase() === 'authorization'
    );

    if (authHeader) {
      patterns.authRequired = true;
      const authValue = String(call.requestHeaders[authHeader] || '');
      if (authValue.startsWith('Bearer ')) {
        patterns.authType = 'Bearer';
      } else if (authValue.startsWith('Basic ')) {
        patterns.authType = 'Basic';
      } else if (authValue.includes('Api-Key') || authValue.includes('api-key')) {
        patterns.authType = 'API-Key';
      }
      break;
    }
  }

  // Detect pagination
  for (const call of apiCalls) {
    if (call.queryParams) {
      const params = Object.keys(call.queryParams);
      if (params.includes('page') || params.includes('pageNumber')) {
        patterns.paginationType = 'page';
        break;
      }
      if (params.includes('offset')) {
        patterns.paginationType = 'offset';
        break;
      }
      if (params.includes('cursor') || params.includes('after')) {
        patterns.paginationType = 'cursor';
        break;
      }
    }
  }

  // Detect API type
  for (const call of apiCalls) {
    const contentType = String(call.responseHeaders['content-type'] || '').toLowerCase();
    if (contentType.includes('application/graphql') || call.requestHeaders['content-type']?.toString().includes('application/graphql')) {
      patterns.apiType = 'GraphQL';
      break;
    }
    if (call.requestHeaders['upgrade']?.toString().toLowerCase() === 'websocket') {
      patterns.apiType = 'WebSocket';
      break;
    }
  }

  if (!patterns.apiType) {
    patterns.apiType = 'REST';
  }

  // Extract CORS headers
  const corsHeaders: Record<string, string> = {};
  for (const call of apiCalls) {
    Object.keys(call.responseHeaders).forEach((key) => {
      if (key.toLowerCase().startsWith('access-control-')) {
        corsHeaders[key] = String(call.responseHeaders[key] || '');
      }
    });
  }

  if (Object.keys(corsHeaders).length > 0) {
    patterns.corsConfig = corsHeaders;
  }

  return patterns;
}

