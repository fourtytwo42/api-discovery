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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify endpoint exists
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
    });

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404 }
      );
    }

    // Parse request body if it's a string
    let requestBodyJson: unknown;
    if (requestBody) {
      try {
        requestBodyJson = typeof requestBody === 'string' ? JSON.parse(requestBody) : requestBody;
      } catch {
        requestBodyJson = undefined;
      }
    }

    // Store the API call
    await prisma.apiCall.create({
      data: {
        endpointId,
        method: method || 'GET',
        url: url,
        protocol: new URL(url).protocol.replace(':', ''),
        requestHeaders: headers || {},
        requestBody: typeof requestBody === 'string' ? requestBody.substring(0, 50000) : undefined,
        requestBodyJson: requestBodyJson ? (requestBodyJson as Prisma.InputJsonValue) : undefined,
        queryParams: (() => {
          try {
            const urlObj = new URL(url);
            const params: Record<string, string> = {};
            urlObj.searchParams.forEach((value, key) => {
              params[key] = value;
            });
            return Object.keys(params).length > 0 ? (params as Prisma.InputJsonValue) : undefined;
          } catch {
            return undefined;
          }
        })(),
        responseStatus: 200, // We don't have the response yet
        responseHeaders: {},
        responseBody: '',
        duration: 0,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(
      { error: handled.message },
      { status: handled.statusCode }
    );
  }
}

