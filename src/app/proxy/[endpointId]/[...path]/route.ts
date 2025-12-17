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
    const targetUrl = `${endpoint.destinationUrl}${targetPath}${queryString}`;

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

      // Capture API call
      const capturedRequest = {
        method,
        url: targetUrl,
        headers: Object.fromEntries(request.headers.entries()),
        queryParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
      };

      let requestBody: string | undefined;
      let requestBodyJson: unknown;
      if (method !== 'GET' && method !== 'HEAD') {
        try {
          requestBody = await request.text();
          requestBodyJson = JSON.parse(requestBody);
        } catch {
          requestBodyJson = undefined;
        }
      }

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

      // Return response
      return new NextResponse(responseBody, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (fetchError) {
      // Store error as API call
      await prisma.apiCall.create({
        data: {
          endpointId,
          method,
          url: targetUrl,
          protocol: targetUrlObj.protocol.replace(':', ''),
          requestHeaders: Object.fromEntries(request.headers.entries()),
          responseStatus: 500,
          responseHeaders: {},
          responseBody: fetchError instanceof Error ? fetchError.message : 'Proxy error',
          duration: Date.now() - startTime,
        },
      });

      return NextResponse.json(
        { error: 'Proxy request failed', details: fetchError instanceof Error ? fetchError.message : 'Unknown error' },
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

