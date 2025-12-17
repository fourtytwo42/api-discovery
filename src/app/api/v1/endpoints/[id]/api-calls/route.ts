import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { NotFoundError, handleError } from '@/lib/utils/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: endpointId } = await params;

    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    
    if (!token) {
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
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Get endpoint
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: { id: true, userId: true },
    });

    if (!endpoint) {
      throw new NotFoundError('Endpoint');
    }

    // Check authorization
    if (endpoint.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get API calls for this endpoint, ordered by most recent first
    const apiCalls = await prisma.apiCall.findMany({
      where: { endpointId },
      orderBy: { timestamp: 'desc' },
      take: 100, // Limit to 100 most recent calls
      select: {
        id: true,
        method: true,
        url: true,
        responseStatus: true,
        duration: true,
        timestamp: true,
        requestHeaders: true,
        requestBody: true,
        responseBody: true,
      },
    });

    return NextResponse.json({
      apiCalls: apiCalls.map((call) => ({
        ...call,
        timestamp: call.timestamp.toISOString(),
      })),
    });
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

