import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { NotFoundError, handleError } from '@/lib/utils/errors';
import { extractEndpointPattern } from '@/lib/proxy/pattern-extraction';

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
      take: 1000, // Get more calls for grouping
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

    // Group API calls by endpoint pattern
    const groupedCalls = new Map<string, typeof apiCalls>();
    
    apiCalls.forEach((call) => {
      const pattern = extractEndpointPattern(call.url, call.method);
      if (!groupedCalls.has(pattern)) {
        groupedCalls.set(pattern, []);
      }
      groupedCalls.get(pattern)!.push(call);
    });

    // Convert to array format with grouping info
    const grouped = Array.from(groupedCalls.entries()).map(([pattern, calls]) => {
      // Sort calls by timestamp (most recent first)
      const sortedCalls = calls.sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      );

      // Calculate average duration
      const durations = sortedCalls
        .map(c => c.duration)
        .filter((d): d is number => d !== null);
      const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

      // Get most common status code
      const statusCounts = new Map<number, number>();
      sortedCalls.forEach(call => {
        if (call.responseStatus !== null) {
          statusCounts.set(call.responseStatus, (statusCounts.get(call.responseStatus) || 0) + 1);
        }
      });
      const mostCommonStatus = Array.from(statusCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      return {
        pattern,
        count: calls.length,
        calls: sortedCalls.map((call) => ({
          ...call,
          timestamp: call.timestamp.toISOString(),
        })),
        avgDuration,
        mostCommonStatus,
        lastCall: sortedCalls[0].timestamp.toISOString(),
      };
    });

    // Sort groups by count (most calls first), then by most recent
    grouped.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return new Date(b.lastCall).getTime() - new Date(a.lastCall).getTime();
    });

    return NextResponse.json({
      grouped,
      totalCalls: apiCalls.length,
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

