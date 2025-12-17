import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { prisma } from '@/lib/database/prisma';
import { validateProxyUrl } from '@/lib/utils/validation';
import { ValidationError, NotFoundError, AuthorizationError, handleError } from '@/lib/utils/errors';
import { logAuditEvent, getClientInfo } from '@/lib/audit/middleware';
import { z } from 'zod';

const updateEndpointSchema = z.object({
  name: z.string().optional(),
  destinationUrl: z.string().url().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    const endpoint = await prisma.endpoint.findUnique({
      where: { id: params.id },
      include: {
        apiCalls: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        },
        discoveredEndpoints: true,
      },
    });

    if (!endpoint) {
      throw new NotFoundError('Endpoint');
    }

    if (endpoint.userId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      throw new AuthorizationError('Not authorized to access this endpoint');
    }

    return NextResponse.json({ endpoint });
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    const endpoint = await prisma.endpoint.findUnique({
      where: { id: params.id },
    });

    if (!endpoint) {
      throw new NotFoundError('Endpoint');
    }

    if (endpoint.userId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      throw new AuthorizationError('Not authorized to update this endpoint');
    }

    const body = await request.json();
    const validated = updateEndpointSchema.parse(body);

    // Validate URL if provided
    if (validated.destinationUrl) {
      const urlValidation = validateProxyUrl(validated.destinationUrl);
      if (!urlValidation.valid) {
        throw new ValidationError(urlValidation.error || 'Invalid URL');
      }
    }

    const updated = await prisma.endpoint.update({
      where: { id: params.id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.destinationUrl && { destinationUrl: validated.destinationUrl }),
        ...(validated.status && { status: validated.status }),
      },
    });

    // Log audit event
    const clientInfo = getClientInfo(request);
    await logAuditEvent({
      userId: authResult.user.id,
      userEmail: authResult.user.email,
      action: 'ENDPOINT_UPDATED',
      resourceType: 'ENDPOINT',
      resourceId: params.id,
      ...clientInfo,
    });

    return NextResponse.json({ endpoint: updated });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    const endpoint = await prisma.endpoint.findUnique({
      where: { id: params.id },
    });

    if (!endpoint) {
      throw new NotFoundError('Endpoint');
    }

    if (endpoint.userId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      throw new AuthorizationError('Not authorized to delete this endpoint');
    }

    await prisma.endpoint.delete({
      where: { id: params.id },
    });

    // Log audit event
    const clientInfo = getClientInfo(request);
    await logAuditEvent({
      userId: authResult.user.id,
      userEmail: authResult.user.email,
      action: 'ENDPOINT_DELETED',
      resourceType: 'ENDPOINT',
      resourceId: params.id,
      ...clientInfo,
    });

    return NextResponse.json({ message: 'Endpoint deleted' });
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

