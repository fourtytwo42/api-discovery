import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { prisma } from '@/lib/database/prisma';
import { generateDocumentation } from '@/lib/documentation/generator';
import { enhanceEndpointWithAI } from '@/lib/ai/enhancement';
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

    const { id } = await params;

    // Verify endpoint exists and user owns it
    const endpoint = await prisma.endpoint.findUnique({
      where: { id },
      include: {
        discoveredEndpoints: true,
      },
    });

    if (!endpoint) {
      throw new NotFoundError('Endpoint');
    }

    if (endpoint.userId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      throw new AuthorizationError('Not authorized to generate documentation for this endpoint');
    }

    if (endpoint.discoveredEndpoints.length === 0) {
      return NextResponse.json(
        { error: 'No discovered endpoints found. Run analysis first.' },
        { status: 400 }
      );
    }

    // Enhance discovered endpoints with AI descriptions
    for (const discovered of endpoint.discoveredEndpoints) {
      if (!discovered.description) {
        try {
          const aiDescription = await enhanceEndpointWithAI(
            discovered.pattern,
            discovered.methods,
            discovered.requestSchema as unknown,
            discovered.responseSchemas as Record<string, unknown> | undefined
          );

          await prisma.discoveredEndpoint.update({
            where: { id: discovered.id },
            data: { description: aiDescription },
          });
        } catch (error) {
          // Continue even if AI enhancement fails
          console.error('AI enhancement failed:', error);
        }
      }
    }

    // Generate documentation
    const documentation = await generateDocumentation(id);

    // Save documentation
    for (const discovered of endpoint.discoveredEndpoints) {
      await prisma.endpointDocumentation.upsert({
        where: {
          endpointId_discoveredEndpointId: {
            endpointId: id,
            discoveredEndpointId: discovered.id,
          },
        },
        create: {
          endpointId: id,
          discoveredEndpointId: discovered.id,
          markdown: documentation.markdown,
          openApiSpec: documentation.openApiSpec,
          typescriptTypes: documentation.typescriptTypes,
        },
        update: {
          markdown: documentation.markdown,
          openApiSpec: documentation.openApiSpec,
          typescriptTypes: documentation.typescriptTypes,
          version: (parseFloat(endpoint.endpointDocs[0]?.version || '1.0.0') + 0.1).toFixed(1),
        },
      });
    }

    return NextResponse.json({
      message: 'Documentation generated successfully',
      documentation,
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

    const endpoint = await prisma.endpoint.findUnique({
      where: { id },
      include: {
        endpointDocs: true,
      },
    });

    if (!endpoint) {
      throw new NotFoundError('Endpoint');
    }

    if (endpoint.userId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      throw new AuthorizationError('Not authorized to view this documentation');
    }

    if (endpoint.endpointDocs.length === 0) {
      return NextResponse.json(
        { error: 'Documentation not generated yet' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      documentation: endpoint.endpointDocs[0],
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

