import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { prisma } from '@/lib/database/prisma';
import { NotFoundError, AuthorizationError, handleError } from '@/lib/utils/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    const { id: endpointId } = await params;
    const body = await request.json();
    const { docIds } = body;

    if (!Array.isArray(docIds) || docIds.length === 0) {
      return NextResponse.json(
        { error: 'docIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Verify endpoint exists and user owns it
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: { id: true, userId: true },
    });

    if (!endpoint) {
      throw new NotFoundError('Endpoint');
    }

    if (endpoint.userId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      throw new AuthorizationError('Not authorized to delete this documentation');
    }

    // Verify all documentation items belong to this endpoint
    const documentationItems = await prisma.endpointDocumentation.findMany({
      where: {
        id: { in: docIds },
      },
      select: { id: true, endpointId: true },
    });

    const invalidIds = documentationItems.filter(doc => doc.endpointId !== endpointId);
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Some documentation items do not belong to this endpoint' },
        { status: 403 }
      );
    }

    // Delete all documentation items
    const result = await prisma.endpointDocumentation.deleteMany({
      where: {
        id: { in: docIds },
        endpointId: endpointId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} documentation item(s)`,
      deletedCount: result.count,
    });
  } catch (error) {
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

