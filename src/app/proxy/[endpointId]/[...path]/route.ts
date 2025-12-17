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
        
        // Construct target URL - handle empty query string properly
        const targetUrl = queryString 
          ? `${baseUrl}${targetPath}${queryString}`
          : `${baseUrl}${targetPath}`;

    // Update last used timestamp
    await prisma.endpoint.update({
      where: { id: endpointId },
      data: { lastUsedAt: new Date() },
    });

    // Forward request to destination
    const startTime = Date.now();
    const targetUrlObj = new URL(targetUrl);

    try {
      // Prepare headers (exclude problematic headers)
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (!['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'proxy-connection', 'proxy-authorization'].includes(lowerKey)) {
          headers[key] = value;
        }
      });

      // Add proper User-Agent if not present
      if (!headers['User-Agent']) {
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      }

      // Get request body for fetch (if not already read)
      let fetchBody: string | undefined;
      if (method !== 'GET' && method !== 'HEAD') {
        fetchBody = await request.text();
      }

      const response = await fetch(targetUrl, {
        method,
        headers,
        body: fetchBody,
        redirect: 'follow',
      });

      const contentType = response.headers.get('Content-Type') || '';
      // More comprehensive binary detection
      const isBinary = /^(image|font|audio|video|application\/octet-stream|application\/pdf|application\/x-font|application\/vnd\.ms-fontobject)/i.test(contentType);
      // More comprehensive asset detection including woff2
      const isAsset = /\.(css|js|woff|woff2|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|mp4|mp3|pdf|map)$/i.test(targetPath) || 
                      /font\/woff/i.test(contentType) ||
                      /font\/woff2/i.test(contentType);
      
      // Get response body as appropriate type
      let responseBody: string | ArrayBuffer;
      let responseBodyText: string | undefined;
      let responseBodyJson: unknown;
      
      if (isBinary || isAsset) {
        // For binary content, get as ArrayBuffer
        responseBody = await response.arrayBuffer();
        responseBodyText = undefined;
      } else {
        // For text content, get as text
        responseBodyText = await response.text();
        responseBody = responseBodyText;
        
        // Try to parse as JSON
        try {
          responseBodyJson = JSON.parse(responseBodyText);
        } catch {
          responseBodyJson = undefined;
        }
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Capture API call - only for non-asset requests
      if (!isAsset) {
        let requestBody: string | undefined;
        let requestBodyJson: unknown;
        if (method !== 'GET' && method !== 'HEAD') {
          requestBody = fetchBody;
          if (requestBody) {
            try {
              requestBodyJson = JSON.parse(requestBody);
            } catch {
              requestBodyJson = undefined;
            }
          }
        }

        const capturedRequest = {
          method,
          url: targetUrl,
          headers: Object.fromEntries(request.headers.entries()),
          queryParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
        };

        // Store captured call (skip for assets to avoid binary data issues)
        try {
          await prisma.apiCall.create({
            data: {
              endpointId,
              method,
              url: targetUrl,
              protocol: targetUrlObj.protocol.replace(':', ''),
              requestHeaders: capturedRequest.headers,
              requestBody: requestBody?.substring(0, 50000),
              requestBodyJson: requestBodyJson ? (requestBodyJson as Prisma.InputJsonValue) : undefined,
              queryParams: capturedRequest.queryParams ? (capturedRequest.queryParams as Prisma.InputJsonValue) : undefined,
              responseStatus: response.status,
              responseHeaders: responseHeaders,
              responseBody: responseBodyText?.substring(0, 50000),
              responseBodyJson: responseBodyJson ? (responseBodyJson as Prisma.InputJsonValue) : undefined,
              duration: Date.now() - startTime,
            },
          });
        } catch (dbError) {
          // Log but don't fail the request if DB insert fails
          console.error('Failed to store API call:', dbError);
        }
      }

      // Filter response headers (remove problematic ones)
      const filteredHeaders: Record<string, string> = {};
      Object.entries(responseHeaders).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        // Don't forward these headers, but preserve content-type
        if (!['content-encoding', 'transfer-encoding', 'connection', 'upgrade', 'keep-alive'].includes(lowerKey)) {
          filteredHeaders[key] = value;
        }
      });
      
      // Ensure content-type is set correctly for assets
      if (isAsset && !filteredHeaders['Content-Type'] && contentType) {
        filteredHeaders['Content-Type'] = contentType;
      }

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

