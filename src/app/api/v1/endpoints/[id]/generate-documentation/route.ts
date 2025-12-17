import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { NotFoundError, AuthorizationError, handleError } from '@/lib/utils/errors';
import { normalizeUrlPattern } from '@/lib/proxy/pattern-extraction';
import { generateCompletion } from '@/lib/ai/groq-client';
import { analyzeHeaders } from '@/lib/analysis/header-analysis';

// Groq GPT OSS 20B supports up to 8192 tokens context window
// We'll use 8000 max_tokens to leave room for the prompt
const MAX_TOKENS = 8000;

interface ApiCallExample {
  method: string;
  url: string;
  pattern: string;
  requestHeaders: Record<string, unknown> | null;
  requestBody: string | null;
  requestBodyJson: unknown;
  queryParams: Record<string, unknown> | null;
  responseStatus: number | null;
  responseHeaders?: Record<string, unknown> | null;
  responseBody: string | null;
  responseBodyJson: unknown;
  timestamp: Date;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const log = (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    console.log(`[DOC-GEN ${timestamp}] ${message}`, data || '');
  };

  try {
    log('Starting documentation generation');
    const { id: endpointId } = await params;

    // Parse request body for optional pattern filter
    let requestedPatterns: string[] | undefined;
    try {
      const body = await request.json();
      requestedPatterns = body.patterns && Array.isArray(body.patterns) && body.patterns.length > 0
        ? body.patterns
        : undefined;
      log('Request patterns filter', { patterns: requestedPatterns });
    } catch {
      // No body or invalid JSON - proceed without filter
      log('No pattern filter provided, will generate for all patterns');
    }

    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    
    if (!token) {
      log('Authentication failed: No token');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let user;
    try {
      const payload = verifyToken(token.value);
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true },
      });
    } catch (error) {
      log('Authentication failed: Invalid token', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (!user) {
      log('Authentication failed: User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Get endpoint
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: { id: true, userId: true, destinationUrl: true, name: true },
    });

    if (!endpoint) {
      log('Endpoint not found', { endpointId });
      throw new NotFoundError('Endpoint');
    }

    // Check authorization
    if (endpoint.userId !== user.id && user.role !== 'ADMIN') {
      log('Authorization failed', { endpointId, userId: user.id });
      throw new AuthorizationError('Not authorized to generate documentation for this endpoint');
    }

    log('Fetching API calls for endpoint', { endpointId });

    // Get all API calls for this endpoint
    const apiCalls = await prisma.apiCall.findMany({
      where: { endpointId },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        method: true,
        url: true,
        requestHeaders: true,
        requestBody: true,
        requestBodyJson: true,
        queryParams: true,
        responseStatus: true,
        responseHeaders: true,
        responseBody: true,
        responseBodyJson: true,
        timestamp: true,
      },
    });

    log('Fetched API calls', { count: apiCalls.length });

    if (apiCalls.length === 0) {
      log('No API calls found for endpoint');
      return NextResponse.json(
        { error: 'No API calls found. Please interact with the proxied site first to capture API calls.' },
        { status: 400 }
      );
    }

    // Group API calls by normalized pattern
    const groupedCalls = new Map<string, ApiCallExample[]>();
    
    for (const call of apiCalls) {
      const pattern = normalizeUrlPattern(call.url);
      const groupKey = `${call.method.toUpperCase()} ${pattern}`;
      
      if (!groupedCalls.has(groupKey)) {
        groupedCalls.set(groupKey, []);
      }
      
      groupedCalls.get(groupKey)!.push({
        method: call.method,
        url: call.url,
        pattern,
        requestHeaders: call.requestHeaders as Record<string, unknown> | null,
        requestBody: call.requestBody,
        requestBodyJson: call.requestBodyJson as unknown,
        queryParams: call.queryParams as Record<string, unknown> | null,
        responseStatus: call.responseStatus,
        responseHeaders: call.responseHeaders as Record<string, unknown> | null,
        responseBody: call.responseBody,
        responseBodyJson: call.responseBodyJson as unknown,
        timestamp: call.timestamp,
      });
    }

    log('Grouped API calls into patterns', { patternCount: groupedCalls.size });

    // Filter patterns if requested
    const patternsToProcess = requestedPatterns
      ? Array.from(groupedCalls.keys()).filter(key => requestedPatterns!.includes(key))
      : Array.from(groupedCalls.keys());

    if (requestedPatterns && patternsToProcess.length === 0) {
      log('No matching patterns found for requested patterns', { requestedPatterns });
      return NextResponse.json(
        { error: 'None of the requested patterns were found in the API calls.' },
        { status: 400 }
      );
    }

    log('Patterns to process', { 
      total: groupedCalls.size,
      requested: requestedPatterns?.length || 'all',
      toProcess: patternsToProcess.length,
    });

    // Generate documentation for each unique API pattern
    const documentationResults: Array<{
      pattern: string;
      method: string;
      documentation: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const groupKey of patternsToProcess) {
      const calls = groupedCalls.get(groupKey);
      if (!calls) {
        log('Skipping missing pattern', { groupKey });
        continue;
      }

      const [method, pattern] = groupKey.split(' ', 2);
      log('Processing pattern', { pattern, method, callCount: calls.length });

      // Get 2-3 examples (prefer recent calls with complete data)
      const examples = calls
        .filter(call => call.responseStatus !== null && (call.responseBody || call.responseBodyJson))
        .slice(0, 3);

      if (examples.length === 0) {
        log('No valid examples found for pattern', { pattern, method });
        documentationResults.push({
          pattern,
          method,
          documentation: '',
          success: false,
          error: 'No valid examples with responses found',
        });
        continue;
      }

      log('Selected examples for pattern', { pattern, method, exampleCount: examples.length });

      // Analyze security headers from examples
      const securityInfo = examples.map(example => 
        analyzeHeaders(
          example.requestHeaders || {},
          example.responseHeaders || {}
        )
      );

      // Build comprehensive prompt
      const prompt = buildDocumentationPrompt(
        endpoint.destinationUrl,
        pattern,
        method,
        examples,
        securityInfo
      );
      log('Built prompt', { pattern, method, promptLength: prompt.length });

      try {
        // Call Groq API with max context window
        log('Calling Groq API', { pattern, method, maxTokens: MAX_TOKENS });
        const groqStartTime = Date.now();
        
        const documentation = await generateCompletion({
          prompt,
          maxTokens: MAX_TOKENS,
          temperature: 0.3,
          model: 'openai/gpt-oss-20b',
        });

        const groqDuration = Date.now() - groqStartTime;
        log('Groq API call completed', { 
          pattern, 
          method, 
          duration: groqDuration,
          documentationLength: documentation.length 
        });

        documentationResults.push({
          pattern,
          method,
          documentation,
          success: true,
        });
      } catch (error) {
        log('Groq API call failed', { pattern, method, error: error instanceof Error ? error.message : 'Unknown error' });
        documentationResults.push({
          pattern,
          method,
          documentation: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Store documentation in database
    log('Storing documentation in database');
    const storedDocs: string[] = [];

    for (const result of documentationResults) {
      if (!result.success || !result.documentation) {
        log('Skipping failed documentation result', { pattern: result.pattern, error: result.error });
        continue;
      }

      try {
        // Find or create discovered endpoint
        // The unique constraint is on [endpointId, pattern, protocol]
        const protocol = 'https'; // Default to https, could be extracted from URL if needed
        const discoveredEndpoint = await prisma.discoveredEndpoint.upsert({
          where: {
            endpointId_pattern_protocol: {
              endpointId,
              pattern: result.pattern,
              protocol,
            },
          },
          create: {
            endpointId,
            pattern: result.pattern,
            methods: [result.method],
            protocol,
            description: null,
            requestSchema: undefined,
            responseSchemas: undefined,
            authRequired: false,
            authType: null,
          },
          update: {
            methods: {
              push: result.method,
            },
          },
        });

        // Get existing documentation to increment version
        const existingDoc = await prisma.endpointDocumentation.findUnique({
          where: {
            endpointId_discoveredEndpointId: {
              endpointId,
              discoveredEndpointId: discoveredEndpoint.id,
            },
          },
          select: { version: true },
        });

        const currentVersion = existingDoc?.version || '1.0.0';
        // Always create new documentation (allow multiple versions)
        // Find the highest version number for this endpoint+discoveredEndpoint combination
        const existingDocsForPattern = await prisma.endpointDocumentation.findMany({
          where: {
            endpointId,
            discoveredEndpointId: discoveredEndpoint.id,
          },
          orderBy: { version: 'desc' },
          take: 1,
        });

        const highestVersion = existingDocsForPattern.length > 0 
          ? existingDocsForPattern[0].version 
          : '0.0';
        const newVersion = (parseFloat(highestVersion) + 0.1).toFixed(1);

        // Create new documentation (don't update existing)
        await prisma.endpointDocumentation.create({
          data: {
            endpointId,
            discoveredEndpointId: discoveredEndpoint.id,
            markdown: result.documentation,
            openApiSpec: null,
            typescriptTypes: null,
            version: newVersion,
          },
        });

        storedDocs.push(result.pattern);
        log('Stored documentation', { pattern: result.pattern });
      } catch (error) {
        log('Failed to store documentation', { 
          pattern: result.pattern, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    log('Documentation generation completed', { 
      totalDuration,
      patternsProcessed: documentationResults.length,
      patternsSucceeded: documentationResults.filter(r => r.success).length,
      patternsStored: storedDocs.length,
    });

    return NextResponse.json({
      success: true,
      message: `Documentation generated for ${storedDocs.length} API pattern(s)`,
      results: documentationResults,
      stored: storedDocs,
      duration: totalDuration,
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    log('Documentation generation failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: totalDuration,
    });

    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
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

function buildDocumentationPrompt(
  baseUrl: string,
  pattern: string,
  method: string,
  examples: ApiCallExample[],
  securityInfo: Array<ReturnType<typeof analyzeHeaders>>
): string {
  const examplesText = examples.map((example, index) => {
    const exampleData: Record<string, unknown> = {
      method: example.method,
      url: example.url,
      requestHeaders: example.requestHeaders,
      queryParams: example.queryParams,
    };

    if (example.requestBodyJson) {
      exampleData.requestBody = example.requestBodyJson;
    } else if (example.requestBody) {
      exampleData.requestBody = example.requestBody;
    }

    exampleData.responseStatus = example.responseStatus;
    exampleData.responseHeaders = example.responseHeaders;

    if (example.responseBodyJson) {
      exampleData.responseBody = example.responseBodyJson;
    } else if (example.responseBody) {
      exampleData.responseBody = example.responseBody;
    }

    return `Example ${index + 1}:
${JSON.stringify(exampleData, null, 2)}`;
  }).join('\n\n');

  // Build security information section
  const securityText = securityInfo.map((sec, index) => {
    const parts: string[] = [];
    
    if (sec.authorization) {
      parts.push(`Authentication: ${sec.authorization.type}`);
      if (sec.authorization.isJwt && sec.authorization.jwtInfo) {
        const jwt = sec.authorization.jwtInfo;
        parts.push(`  - JWT Token: ${jwt.token}`);
        parts.push(`  - Algorithm: ${jwt.algorithm || 'unknown'}`);
        if (jwt.expiresAt) {
          parts.push(`  - Expires: ${jwt.expiresAt.toISOString()}`);
        }
        if (jwt.issuedAt) {
          parts.push(`  - Issued: ${jwt.issuedAt.toISOString()}`);
        }
        parts.push(`  - Payload: ${JSON.stringify(jwt.payload, null, 2)}`);
      } else {
        parts.push(`  - Value: ${sec.authorization.value}`);
      }
    }

    if (sec.cors) {
      parts.push(`CORS Configuration:`);
      if (sec.cors.allowOrigin.length > 0) {
        parts.push(`  - Allowed Origins: ${sec.cors.allowOrigin.join(', ')}`);
      }
      if (sec.cors.allowMethods.length > 0) {
        parts.push(`  - Allowed Methods: ${sec.cors.allowMethods.join(', ')}`);
      }
      if (sec.cors.allowHeaders.length > 0) {
        parts.push(`  - Allowed Headers: ${sec.cors.allowHeaders.join(', ')}`);
      }
      if (sec.cors.allowCredentials) {
        parts.push(`  - Credentials: Allowed`);
      }
      if (sec.cors.maxAge) {
        parts.push(`  - Max Age: ${sec.cors.maxAge} seconds`);
      }
    }

    if (sec.security) {
      parts.push(`Security Headers:`);
      if (sec.security.contentTypeOptions) {
        parts.push(`  - X-Content-Type-Options: ${sec.security.contentTypeOptions}`);
      }
      if (sec.security.frameOptions) {
        parts.push(`  - X-Frame-Options: ${sec.security.frameOptions}`);
      }
      if (sec.security.xssProtection) {
        parts.push(`  - X-XSS-Protection: ${sec.security.xssProtection}`);
      }
      if (sec.security.strictTransportSecurity) {
        parts.push(`  - Strict-Transport-Security: ${sec.security.strictTransportSecurity}`);
      }
      if (sec.security.referrerPolicy) {
        parts.push(`  - Referrer-Policy: ${sec.security.referrerPolicy}`);
      }
      if (sec.security.permissionsPolicy) {
        parts.push(`  - Permissions-Policy: ${sec.security.permissionsPolicy}`);
      }
    }

    return parts.length > 0 ? `Security Info for Example ${index + 1}:\n${parts.join('\n')}` : '';
  }).filter(text => text.length > 0).join('\n\n');

  const securitySection = securityText ? `\n\nSecurity Information:\n${securityText}\n` : '';

  // Check if authentication is actually required
  const hasAuthHeader = examples.some(ex => {
    const headers = ex.requestHeaders || {};
    return !!(headers['authorization'] || headers['Authorization']);
  });
  const has401Response = examples.some(ex => ex.responseStatus === 401);
  const authRequired = hasAuthHeader || has401Response;

  return `You are an API documentation expert. Generate comprehensive, professional API documentation for the following endpoint.

Base URL: ${baseUrl}
Endpoint Pattern: ${pattern}
HTTP Method: ${method}

Here are ${examples.length} example API call(s) with their request and response data:

${examplesText}${securitySection}

CRITICAL INSTRUCTIONS FOR AUTHENTICATION:
- ONLY include authentication requirements if there is CLEAR EVIDENCE:
  * An "Authorization" header is present in the request headers (NOT Cookie headers)
  * OR 401 Unauthorized responses are returned
- DO NOT assume authentication is required just because you see cookies or other headers
- Cookie headers (like "token" or "active-proxy-endpoint") are for the proxy system, NOT the target API
- If there is NO Authorization header and NO 401 responses, the endpoint does NOT require authentication
- Only document authentication if the examples show clear evidence of it being required

Please generate detailed API documentation in Markdown format that includes:

1. **Endpoint Overview**: A clear description of what this endpoint does
2. **HTTP Method and Path**: The method and normalized path pattern
3. **Authentication**:
   ${authRequired 
     ? '- Authentication method required (based on Authorization header or 401 responses)\n   - JWT token details (if JWT is used): token format, expiration, payload contents\n   - How to obtain and use authentication tokens\n   - Token expiration and renewal information'
     : '- This endpoint does NOT require authentication (no Authorization header found, no 401 responses)'}
4. **Request Details**:
   - Headers (required and optional${authRequired ? ', including authentication headers' : ''})
   - Query Parameters (if any)
   - Request Body Schema (if applicable)
   - Example request with full headers
5. **Response Details**:
   - Response status codes and their meanings
   - Response headers (including CORS and security headers)
   - Response body schema
   - Example responses for each status code
6. **CORS Configuration**: CORS settings if applicable (allowed origins, methods, headers, credentials)
7. **Security Headers**: Security-related headers returned by the API
8. **Usage Examples**: Code examples showing how to call this endpoint${authRequired ? ' with proper authentication' : ' (no authentication required)'}
9. **Error Handling**: Common error responses and how to handle them

${authRequired ? 'IMPORTANT: If JWT tokens are used, include the actual token in the documentation so developers can use it, along with expiration information and what data the token contains.' : 'IMPORTANT: This endpoint does not require authentication. Do not include any authentication requirements in the documentation.'}

Make the documentation clear, professional, and useful for developers who want to integrate with this API. Use proper Markdown formatting with headers, code blocks, and lists.

Generate the documentation now:`;
}

