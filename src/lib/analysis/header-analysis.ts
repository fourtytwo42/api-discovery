/**
 * Analyze HTTP headers for security information, JWT tokens, CORS, etc.
 */

export interface JwtInfo {
  token: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  expiresAt: Date | null;
  issuedAt: Date | null;
  algorithm: string | null;
  isValid: boolean;
  error?: string;
}

export interface SecurityHeaders {
  authorization?: {
    type: string; // "Bearer", "Basic", "API-Key", etc.
    value: string; // The actual token/key (may be truncated)
    isJwt: boolean;
    jwtInfo?: JwtInfo;
  };
  cors?: {
    allowOrigin: string[];
    allowMethods: string[];
    allowHeaders: string[];
    allowCredentials: boolean;
    maxAge?: number;
  };
  security?: {
    contentTypeOptions?: string;
    frameOptions?: string;
    xssProtection?: string;
    strictTransportSecurity?: string;
    referrerPolicy?: string;
    permissionsPolicy?: string;
  };
  custom?: Record<string, string>;
}

/**
 * Decode JWT token without verification (just to show contents)
 */
export function decodeJwt(token: string): JwtInfo | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode header
    const headerJson = Buffer.from(parts[0], 'base64url').toString('utf-8');
    const header = JSON.parse(headerJson);

    // Decode payload
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    // Extract expiration
    let expiresAt: Date | null = null;
    if (payload.exp) {
      expiresAt = new Date(payload.exp * 1000);
    }

    // Extract issued at
    let issuedAt: Date | null = null;
    if (payload.iat) {
      issuedAt = new Date(payload.iat * 1000);
    }

    return {
      token,
      header,
      payload,
      expiresAt,
      issuedAt,
      algorithm: header.alg || null,
      isValid: true,
    };
  } catch (error) {
    return {
      token,
      header: {},
      payload: {},
      expiresAt: null,
      issuedAt: null,
      algorithm: null,
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to decode JWT',
    };
  }
}

/**
 * Extract JWT from Authorization header
 */
export function extractJwtFromHeaders(headers: Record<string, unknown>): JwtInfo | null {
  const authHeader = headers['authorization'] || headers['Authorization'];
  
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  // Check for Bearer token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    return decodeJwt(token);
  }

  // Check if the entire header is a JWT (some APIs use custom headers)
  if (authHeader.includes('.') && authHeader.split('.').length === 3) {
    return decodeJwt(authHeader);
  }

  return null;
}

/**
 * Analyze headers for security information
 */
export function analyzeHeaders(
  requestHeaders: Record<string, unknown>,
  responseHeaders?: Record<string, unknown>
): SecurityHeaders {
  const security: SecurityHeaders = {};

  // Analyze Authorization header
  const authHeader = requestHeaders['authorization'] || requestHeaders['Authorization'];
  if (authHeader && typeof authHeader === 'string') {
    const jwtInfo = extractJwtFromHeaders(requestHeaders);
    security.authorization = {
      type: authHeader.startsWith('Bearer ') ? 'Bearer' :
            authHeader.startsWith('Basic ') ? 'Basic' :
            authHeader.startsWith('Api-Key ') || authHeader.startsWith('API-Key ') ? 'API-Key' :
            'Custom',
      value: authHeader.length > 50 ? authHeader.substring(0, 50) + '...' : authHeader,
      isJwt: jwtInfo !== null && jwtInfo.isValid,
      jwtInfo: jwtInfo || undefined,
    };
  }

  // Analyze CORS headers (from response)
  if (responseHeaders) {
    const corsHeaders: SecurityHeaders['cors'] = {
      allowOrigin: [],
      allowMethods: [],
      allowHeaders: [],
      allowCredentials: false,
    };

    const accessControlAllowOrigin = responseHeaders['access-control-allow-origin'] ||
                                     responseHeaders['Access-Control-Allow-Origin'];
    if (accessControlAllowOrigin) {
      corsHeaders.allowOrigin = String(accessControlAllowOrigin).split(',').map(s => s.trim());
    }

    const accessControlAllowMethods = responseHeaders['access-control-allow-methods'] ||
                                       responseHeaders['Access-Control-Allow-Methods'];
    if (accessControlAllowMethods) {
      corsHeaders.allowMethods = String(accessControlAllowMethods).split(',').map(s => s.trim());
    }

    const accessControlAllowHeaders = responseHeaders['access-control-allow-headers'] ||
                                       responseHeaders['Access-Control-Allow-Headers'];
    if (accessControlAllowHeaders) {
      corsHeaders.allowHeaders = String(accessControlAllowHeaders).split(',').map(s => s.trim());
    }

    const accessControlAllowCredentials = responseHeaders['access-control-allow-credentials'] ||
                                          responseHeaders['Access-Control-Allow-Credentials'];
    if (accessControlAllowCredentials === 'true' || accessControlAllowCredentials === true) {
      corsHeaders.allowCredentials = true;
    }

    const accessControlMaxAge = responseHeaders['access-control-max-age'] ||
                                 responseHeaders['Access-Control-Max-Age'];
    if (accessControlMaxAge) {
      corsHeaders.maxAge = parseInt(String(accessControlMaxAge), 10);
    }

    if (corsHeaders.allowOrigin.length > 0 || corsHeaders.allowMethods.length > 0) {
      security.cors = corsHeaders;
    }
  }

  // Analyze security headers (from response)
  if (responseHeaders) {
    const secHeaders: SecurityHeaders['security'] = {};

    const contentTypeOptions = responseHeaders['x-content-type-options'] ||
                               responseHeaders['X-Content-Type-Options'];
    if (contentTypeOptions) {
      secHeaders.contentTypeOptions = String(contentTypeOptions);
    }

    const frameOptions = responseHeaders['x-frame-options'] ||
                         responseHeaders['X-Frame-Options'];
    if (frameOptions) {
      secHeaders.frameOptions = String(frameOptions);
    }

    const xssProtection = responseHeaders['x-xss-protection'] ||
                          responseHeaders['X-XSS-Protection'];
    if (xssProtection) {
      secHeaders.xssProtection = String(xssProtection);
    }

    const strictTransportSecurity = responseHeaders['strict-transport-security'] ||
                                    responseHeaders['Strict-Transport-Security'];
    if (strictTransportSecurity) {
      secHeaders.strictTransportSecurity = String(strictTransportSecurity);
    }

    const referrerPolicy = responseHeaders['referrer-policy'] ||
                           responseHeaders['Referrer-Policy'];
    if (referrerPolicy) {
      secHeaders.referrerPolicy = String(referrerPolicy);
    }

    const permissionsPolicy = responseHeaders['permissions-policy'] ||
                              responseHeaders['Permissions-Policy'];
    if (permissionsPolicy) {
      secHeaders.permissionsPolicy = String(permissionsPolicy);
    }

    if (Object.keys(secHeaders).length > 0) {
      security.security = secHeaders;
    }
  }

  // Collect custom/other headers
  const customHeaders: Record<string, string> = {};
  const knownHeaders = new Set([
    'authorization', 'authorization',
    'content-type', 'content-length',
    'accept', 'user-agent',
    'access-control-allow-origin', 'access-control-allow-methods',
    'access-control-allow-headers', 'access-control-allow-credentials',
    'x-content-type-options', 'x-frame-options', 'x-xss-protection',
    'strict-transport-security', 'referrer-policy', 'permissions-policy',
  ]);

  for (const [key, value] of Object.entries(requestHeaders)) {
    const lowerKey = key.toLowerCase();
    if (!knownHeaders.has(lowerKey) && typeof value === 'string') {
      customHeaders[key] = value.length > 100 ? value.substring(0, 100) + '...' : value;
    }
  }

  if (Object.keys(customHeaders).length > 0) {
    security.custom = customHeaders;
  }

  return security;
}

/**
 * Group security headers across multiple API calls
 */
export function groupSecurityHeaders(
  calls: Array<{
    requestHeaders: Record<string, unknown>;
    responseHeaders?: Record<string, unknown>;
  }>
): SecurityHeaders {
  // Find the most common/representative headers
  const authHeaderCounts = new Map<string, number>();
  const jwtTokens = new Map<string, JwtInfo>();
  const corsConfigs = new Map<string, SecurityHeaders['cors']>();
  const securityConfigs = new Map<string, SecurityHeaders['security']>();

  for (const call of calls) {
    const analysis = analyzeHeaders(call.requestHeaders, call.responseHeaders);

    if (analysis.authorization) {
      const key = `${analysis.authorization.type}:${analysis.authorization.value.substring(0, 20)}`;
      authHeaderCounts.set(key, (authHeaderCounts.get(key) || 0) + 1);
      
      if (analysis.authorization.jwtInfo) {
        const tokenKey = analysis.authorization.jwtInfo.token.substring(0, 50);
        if (!jwtTokens.has(tokenKey)) {
          jwtTokens.set(tokenKey, analysis.authorization.jwtInfo);
        }
      }
    }

    if (analysis.cors) {
      const corsKey = JSON.stringify(analysis.cors);
      corsConfigs.set(corsKey, analysis.cors);
    }

    if (analysis.security) {
      const secKey = JSON.stringify(analysis.security);
      securityConfigs.set(secKey, analysis.security);
    }
  }

  // Get most common authorization
  let mostCommonAuth: SecurityHeaders['authorization'] | undefined;
  if (authHeaderCounts.size > 0) {
    const sorted = Array.from(authHeaderCounts.entries()).sort((a, b) => b[1] - a[1]);
    const mostCommonKey = sorted[0][0];
    // Find the corresponding auth info
    for (const call of calls) {
      const analysis = analyzeHeaders(call.requestHeaders, call.responseHeaders);
      if (analysis.authorization) {
        const key = `${analysis.authorization.type}:${analysis.authorization.value.substring(0, 20)}`;
        if (key === mostCommonKey) {
          mostCommonAuth = analysis.authorization;
          break;
        }
      }
    }
  }

  // Get most common CORS config
  let mostCommonCors: SecurityHeaders['cors'] | undefined;
  if (corsConfigs.size > 0) {
    const corsValues = Array.from(corsConfigs.values());
    mostCommonCors = corsValues[0]; // Use first one as representative
  }

  // Get most common security config
  let mostCommonSecurity: SecurityHeaders['security'] | undefined;
  if (securityConfigs.size > 0) {
    const secValues = Array.from(securityConfigs.values());
    mostCommonSecurity = secValues[0]; // Use first one as representative
  }

  return {
    authorization: mostCommonAuth,
    cors: mostCommonCors,
    security: mostCommonSecurity,
  };
}

