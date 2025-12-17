import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { prisma } from '@/lib/database/prisma';
import { NotFoundError, AuthorizationError, handleError } from '@/lib/utils/errors';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    const { id: endpointId, docId } = await params;

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

    // Verify documentation exists and belongs to this endpoint
    const documentation = await prisma.endpointDocumentation.findUnique({
      where: { id: docId },
      select: { id: true, endpointId: true },
    });

    if (!documentation) {
      throw new NotFoundError('Documentation');
    }

    if (documentation.endpointId !== endpointId) {
      throw new AuthorizationError('Documentation does not belong to this endpoint');
    }

    // Delete the documentation
    await prisma.endpointDocumentation.delete({
      where: { id: docId },
    });

    return NextResponse.json({
      success: true,
      message: 'Documentation deleted successfully',
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

