import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { prisma } from '@/lib/database/prisma';
import { NotFoundError, AuthorizationError, handleError } from '@/lib/utils/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'markdown';

    // Verify endpoint exists and user owns it
    const endpoint = await prisma.endpoint.findUnique({
      where: { id },
      include: {
        endpointDocs: {
          take: 1,
          orderBy: { generatedAt: 'desc' },
        },
      },
    });

    if (!endpoint) {
      throw new NotFoundError('Endpoint');
    }

    if (endpoint.userId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      throw new AuthorizationError('Not authorized to export this documentation');
    }

    if (endpoint.endpointDocs.length === 0) {
      return NextResponse.json(
        { error: 'Documentation not generated yet' },
        { status: 404 }
      );
    }

    const doc = endpoint.endpointDocs[0];

    // Return appropriate format
    if (format === 'markdown') {
      return new NextResponse(doc.markdown || '', {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="api-docs-${id}.md"`,
        },
      });
    }

    if (format === 'openapi' || format === 'json') {
      return new NextResponse(doc.openApiSpec || '{}', {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="api-docs-${id}.json"`,
        },
      });
    }

    if (format === 'typescript' || format === 'ts') {
      return new NextResponse(doc.typescriptTypes || '', {
        headers: {
          'Content-Type': 'text/typescript',
          'Content-Disposition': `attachment; filename="api-types-${id}.ts"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid format. Use: markdown, openapi, or typescript' },
      { status: 400 }
    );
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

