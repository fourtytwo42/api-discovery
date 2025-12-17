import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { Prisma } from '@prisma/client';
import { validateProxyUrl } from '@/lib/proxy/validation';
import { NotFoundError, handleError } from '@/lib/utils/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string; path: string[] }> }
) {
  return handleProxyRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string; path: string[] }> }
) {
  return handleProxyRequest(request, params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string; path: string[] }> }
) {
  return handleProxyRequest(request, params, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string; path: string[] }> }
) {
  return handleProxyRequest(request, params, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string; path: string[] }> }
) {
  return handleProxyRequest(request, params, 'PATCH');
}

async function handleProxyRequest(
  request: NextRequest,
  params: Promise<{ endpointId: string; path: string[] }>,
  method: string
) {
  try {
    const { endpointId, path: pathSegments } = await params;

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

    // Build target URL
    const targetPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';
    const queryString = request.nextUrl.search;
    
    // Normalize destination URL (remove trailing slash)
    let baseUrl = endpoint.destinationUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // Construct target URL
    const targetUrl = `${baseUrl}${targetPath}${queryString}`;

    // Update last used timestamp
    await prisma.endpoint.update({
      where: { id: endpointId },
      data: { lastUsedAt: new Date() },
    });

    // Forward request to destination
    const startTime = Date.now();
    const targetUrlObj = new URL(targetUrl);

    try {
      const response = await fetch(targetUrl, {
        method,
        headers: Object.fromEntries(request.headers.entries()),
        body: method !== 'GET' && method !== 'HEAD' ? await request.text() : undefined,
      });

      const responseBody = await response.text();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Capture API call - read request body before it's consumed
      let requestBody: string | undefined;
      let requestBodyJson: unknown;
      if (method !== 'GET' && method !== 'HEAD') {
        try {
          // Clone request to read body
          const clonedRequest = request.clone();
          requestBody = await clonedRequest.text();
          if (requestBody) {
            try {
              requestBodyJson = JSON.parse(requestBody);
            } catch {
              requestBodyJson = undefined;
            }
          }
        } catch {
          requestBodyJson = undefined;
        }
      }

      const capturedRequest = {
        method,
        url: targetUrl,
        headers: Object.fromEntries(request.headers.entries()),
        queryParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
      };

      let responseBodyJson: unknown;
      try {
        responseBodyJson = JSON.parse(responseBody);
      } catch {
        responseBodyJson = undefined;
      }

      // Store captured call
      await prisma.apiCall.create({
        data: {
          endpointId,
          method,
          url: targetUrl,
          protocol: targetUrlObj.protocol.replace(':', ''),
          requestHeaders: capturedRequest.headers,
          requestBody: requestBody?.substring(0, 50000), // Truncate if too large
          requestBodyJson: requestBodyJson ? (requestBodyJson as Prisma.InputJsonValue) : undefined,
          queryParams: capturedRequest.queryParams ? (capturedRequest.queryParams as Prisma.InputJsonValue) : undefined,
          responseStatus: response.status,
          responseHeaders: responseHeaders,
          responseBody: responseBody.substring(0, 50000), // Truncate if too large
          responseBodyJson: responseBodyJson ? (responseBodyJson as Prisma.InputJsonValue) : undefined,
          duration: Date.now() - startTime,
        },
      });

      // Filter response headers (remove problematic ones)
      const filteredHeaders: Record<string, string> = {};
      Object.entries(responseHeaders).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        // Don't forward these headers
        if (!['content-encoding', 'transfer-encoding', 'connection', 'upgrade', 'keep-alive'].includes(lowerKey)) {
          filteredHeaders[key] = value;
        }
      });

      // Return response with correct body type
      if (isBinary || isAsset) {
        // Convert ArrayBuffer to Buffer for NextResponse
        const buffer = Buffer.from(responseBody as ArrayBuffer);
        return new NextResponse(buffer, {
          status: response.status,
          headers: filteredHeaders,
        });
      } else {
        return new NextResponse(responseBody as string, {
          status: response.status,
          headers: filteredHeaders,
        });
      }
    } catch (fetchError) {
      // Log the error for debugging
      console.error('Proxy fetch error:', {
        endpointId,
        targetUrl,
        method,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
      });

      // Store error as API call (only for non-asset requests to avoid spam)
      const isAssetRequest = /\.(css|js|woff|woff2|ttf|eot|png|jpg|jpeg|gif|svg|ico|webp)$/i.test(targetPath);
      if (!isAssetRequest) {
        try {
          await prisma.apiCall.create({
            data: {
              endpointId,
              method,
              url: targetUrl,
              protocol: targetUrlObj.protocol.replace(':', ''),
              requestHeaders: Object.fromEntries(request.headers.entries()),
              responseStatus: 502,
              responseHeaders: {},
              responseBody: fetchError instanceof Error ? fetchError.message : 'Proxy error',
              duration: Date.now() - startTime,
            },
          });
        } catch (dbError) {
          // Ignore DB errors for failed requests
          console.error('Failed to log API call error:', dbError);
        }
      }

      return NextResponse.json(
        { 
          error: 'Proxy request failed', 
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          url: targetUrl,
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

