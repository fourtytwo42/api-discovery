import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { NotFoundError, AuthorizationError, handleError } from '@/lib/utils/errors';
import { normalizeUrlPattern } from '@/lib/proxy/pattern-extraction';
import { generateCompletion } from '@/lib/ai/groq-client';

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
  responseHeaders: Record<string, unknown> | null;
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

      // Build comprehensive prompt
      const prompt = buildDocumentationPrompt(endpoint.destinationUrl, pattern, method, examples);
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
        const newVersion = (parseFloat(currentVersion) + 0.1).toFixed(1);

        // Store documentation
        await prisma.endpointDocumentation.upsert({
          where: {
            endpointId_discoveredEndpointId: {
              endpointId,
              discoveredEndpointId: discoveredEndpoint.id,
            },
          },
          create: {
            endpointId,
            discoveredEndpointId: discoveredEndpoint.id,
            markdown: result.documentation,
            openApiSpec: null,
            typescriptTypes: null,
            version: '1.0.0',
          },
          update: {
            markdown: result.documentation,
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
  examples: ApiCallExample[]
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

  return `You are an API documentation expert. Generate comprehensive, professional API documentation for the following endpoint.

Base URL: ${baseUrl}
Endpoint Pattern: ${pattern}
HTTP Method: ${method}

Here are ${examples.length} example API call(s) with their request and response data:

${examplesText}

Please generate detailed API documentation in Markdown format that includes:

1. **Endpoint Overview**: A clear description of what this endpoint does
2. **HTTP Method and Path**: The method and normalized path pattern
3. **Request Details**:
   - Headers (required and optional)
   - Query Parameters (if any)
   - Request Body Schema (if applicable)
   - Example request
4. **Response Details**:
   - Response status codes and their meanings
   - Response headers
   - Response body schema
   - Example responses for each status code
5. **Authentication**: Note if authentication appears to be required based on the examples
6. **Usage Examples**: Code examples showing how to call this endpoint
7. **Error Handling**: Common error responses and how to handle them

Make the documentation clear, professional, and useful for developers who want to integrate with this API. Use proper Markdown formatting with headers, code blocks, and lists.

Generate the documentation now:`;
}

