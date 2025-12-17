import { prisma } from '../database/prisma';
import { extractEndpointPatterns, EndpointPattern } from './endpoint-extraction';
import { inferSchema } from './schema-inference';
import { detectPatterns, ApiPatterns } from './pattern-detection';
import { Prisma } from '@prisma/client';

export interface AnalysisResult {
  discoveredEndpoints: Array<{
    pattern: string;
    methods: string[];
    requestSchema?: unknown;
    responseSchemas?: Record<string, unknown>;
    patterns: ApiPatterns;
  }>;
}

/**
 * Analyze captured API calls and generate discovered endpoints
 */
export async function analyzeEndpoint(endpointId: string): Promise<AnalysisResult> {
  // Get all captured API calls for this endpoint
  const apiCalls = await prisma.apiCall.findMany({
    where: { endpointId },
    orderBy: { timestamp: 'desc' },
    take: 1000, // Limit to recent calls
  });

  if (apiCalls.length === 0) {
    return { discoveredEndpoints: [] };
  }

  // Extract endpoint patterns
  const endpointPatterns = extractEndpointPatterns(
    apiCalls.map((call) => ({
      method: call.method,
      url: call.url,
    }))
  );

  // Group calls by pattern
  const callsByPattern = new Map<string, typeof apiCalls>();
  endpointPatterns.forEach((pattern) => {
    const matchingCalls = apiCalls.filter((call) => {
      const callPattern = extractEndpointPatterns([{ method: call.method, url: call.url }])[0];
      return callPattern?.pattern === pattern.pattern;
    });
    callsByPattern.set(pattern.pattern, matchingCalls);
  });

  // Analyze each pattern
  const discoveredEndpoints = endpointPatterns.map((pattern) => {
    const patternCalls = callsByPattern.get(pattern.pattern) || [];

    // Infer request schema
    const requestBodies = patternCalls
      .map((call) => call.requestBodyJson)
      .filter((body): body is unknown => body !== null && body !== undefined);
    const requestSchema = requestBodies.length > 0 ? inferSchema(requestBodies) : undefined;

    // Infer response schemas by status code
    const responseSchemas: Record<string, unknown> = {};
    const callsByStatus = new Map<number, typeof patternCalls>();
    patternCalls.forEach((call) => {
      if (call.responseStatus) {
        if (!callsByStatus.has(call.responseStatus)) {
          callsByStatus.set(call.responseStatus, []);
        }
        callsByStatus.get(call.responseStatus)!.push(call);
      }
    });

    callsByStatus.forEach((calls, status) => {
      const responseBodies = calls
        .map((call) => call.responseBodyJson)
        .filter((body): body is unknown => body !== null && body !== undefined);
      if (responseBodies.length > 0) {
        responseSchemas[String(status)] = inferSchema(responseBodies);
      }
    });

    // Detect patterns
    const patterns = detectPatterns(
      patternCalls.map((call) => ({
        method: call.method,
        requestHeaders: call.requestHeaders as Record<string, unknown>,
        responseHeaders: call.responseHeaders as Record<string, unknown>,
        queryParams: call.queryParams as Record<string, unknown> | undefined,
        responseStatus: call.responseStatus || undefined,
      }))
    );

    return {
      pattern: pattern.pattern,
      methods: pattern.methods,
      requestSchema: requestSchema ? (requestSchema as Prisma.InputJsonValue) : undefined,
      responseSchemas: Object.keys(responseSchemas).length > 0 ? (responseSchemas as Prisma.InputJsonValue) : undefined,
      patterns,
    };
  });

  return { discoveredEndpoints };
}

/**
 * Save analysis results to database
 */
export async function saveAnalysisResults(
  endpointId: string,
  results: AnalysisResult
): Promise<void> {
  // Delete existing discovered endpoints
  await prisma.discoveredEndpoint.deleteMany({
    where: { endpointId },
  });

  // Create new discovered endpoints
  for (const endpoint of results.discoveredEndpoints) {
    await prisma.discoveredEndpoint.create({
      data: {
        endpointId,
        pattern: endpoint.pattern,
        methods: endpoint.methods,
        requestSchema: endpoint.requestSchema as Prisma.InputJsonValue | undefined,
        responseSchemas: endpoint.responseSchemas as Prisma.InputJsonValue | undefined,
        authRequired: endpoint.patterns.authRequired,
        authType: endpoint.patterns.authType || null,
        paginationType: endpoint.patterns.paginationType || null,
        apiType: endpoint.patterns.apiType || null,
        corsConfig: endpoint.patterns.corsConfig ? (endpoint.patterns.corsConfig as Prisma.InputJsonValue) : null,
      },
    });
  }

  // Update endpoint status
  await prisma.endpoint.update({
    where: { id: endpointId },
    data: { processedAt: new Date() },
  });
}

