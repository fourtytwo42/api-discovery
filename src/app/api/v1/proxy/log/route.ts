import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { Prisma } from '@prisma/client';
import { handleError } from '@/lib/utils/errors';

// This endpoint receives API call logs from the injected JavaScript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpointId, url, method, body: requestBody, headers, timestamp } = body;

    if (!endpointId || !url) {
      return NextResponse.json({ success: true }); // Return 200 to prevent retries
    }

    // Skip logging for asset requests to reduce memory usage
    const urlLower = url.toLowerCase();
    const isAsset = /\.(css|js|woff|woff2|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|mp4|mp3|pdf|map)$/i.test(urlLower) ||
                    urlLower.includes('/_next/') ||
                    urlLower.includes('/static/') ||
                    urlLower.includes('/assets/') ||
                    urlLower.includes('/images/') ||
                    urlLower.includes('/fonts/');
    
    if (isAsset) {
      return NextResponse.json({ success: true, skipped: 'asset' });
    }

    // Verify endpoint exists (but don't fail if it doesn't)
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
    });

    if (!endpoint) {
      return NextResponse.json({ success: true }); // Return 200 to prevent retries
    }

    // Parse URL safely (may be relative)
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      urlObj = new URL(url, 'http://localhost');
    }

    // Truncate body to prevent memory issues (max 5KB)
    let truncatedRequestBody: string | undefined;
    if (requestBody) {
      if (typeof requestBody === 'string') {
        truncatedRequestBody = requestBody.substring(0, 5000);
      } else {
        try {
          const bodyStr = JSON.stringify(requestBody);
          truncatedRequestBody = bodyStr.substring(0, 5000);
        } catch {
          truncatedRequestBody = '[body too large or invalid]';
        }
      }
    }

    // Truncate headers (max 2KB)
    let truncatedHeaders: Prisma.InputJsonValue | undefined;
    if (headers) {
      try {
        const headersStr = JSON.stringify(headers);
        if (headersStr.length > 2000) {
          truncatedHeaders = JSON.parse(headersStr.substring(0, 2000));
        } else {
          truncatedHeaders = headers as Prisma.InputJsonValue;
        }
      } catch {
        truncatedHeaders = {};
      }
    }

    // Store the API call
    await prisma.apiCall.create({
      data: {
        endpointId,
        method: method || 'GET',
        url: url.length > 2000 ? url.substring(0, 2000) : url, // Truncate URL if too long
        protocol: urlObj.protocol.replace(':', ''),
        requestHeaders: truncatedHeaders || {},
        requestBody: truncatedRequestBody,
        requestBodyJson: undefined, // Don't store JSON separately for client-side logs
        queryParams: (() => {
          try {
            const params: Record<string, string> = {};
            urlObj.searchParams.forEach((value, key) => {
              params[key] = value;
            });
            return Object.keys(params).length > 0 ? (params as Prisma.InputJsonValue) : undefined;
          } catch {
            return undefined;
          }
        })(),
        responseStatus: null, // Response not available from client-side log
        responseHeaders: {},
        responseBody: null,
        responseBodyJson: null,
        duration: 0,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log error but return 200 to prevent client retries
    console.error('Error logging API call from client:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: true }); // Return 200 to prevent retries
  }
}

