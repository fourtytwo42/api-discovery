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
    const docId = searchParams.get('docId');

    // Verify endpoint exists and user owns it
    const endpoint = await prisma.endpoint.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!endpoint) {
      throw new NotFoundError('Endpoint');
    }

    if (endpoint.userId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      throw new AuthorizationError('Not authorized to export this documentation');
    }

    // Get specific documentation or latest
    let doc;
    if (docId) {
      doc = await prisma.endpointDocumentation.findFirst({
        where: {
          id: docId,
          endpointId: id,
        },
      });
    } else {
      const docs = await prisma.endpointDocumentation.findMany({
        where: { endpointId: id },
        orderBy: { generatedAt: 'desc' },
        take: 1,
      });
      doc = docs[0];
    }

    if (!doc) {
      return NextResponse.json(
        { error: 'Documentation not found' },
        { status: 404 }
      );
    }

    // Return appropriate format
    if (format === 'markdown') {
      return new NextResponse(doc.markdown || '', {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="api-docs-${id}.md"`,
        },
      });
    }

    if (format === 'pdf') {
      // PDF export will be handled client-side
      return NextResponse.json(
        { error: 'PDF export must be done client-side' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid format. Use: markdown or pdf' },
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

