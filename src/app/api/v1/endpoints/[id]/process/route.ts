import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { prisma } from '@/lib/database/prisma';
import { analyzeEndpoint, saveAnalysisResults } from '@/lib/analysis/analyzer';
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
    });

    if (!endpoint) {
      throw new NotFoundError('Endpoint');
    }

    if (endpoint.userId !== authResult.user.id && authResult.user.role !== 'ADMIN') {
      throw new AuthorizationError('Not authorized to process this endpoint');
    }

    // Check if endpoint has captured calls
    const callCount = await prisma.apiCall.count({
      where: { endpointId: id },
    });

    if (callCount === 0) {
      return NextResponse.json(
        { error: 'No API calls captured yet. Use the proxy URL to make some requests first.' },
        { status: 400 }
      );
    }

    // Update status to PROCESSING
    await prisma.endpoint.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    // Run analysis
    const results = await analyzeEndpoint(id);

    // Save results
    await saveAnalysisResults(id, results);

    // Update status based on results
    const finalStatus = results.discoveredEndpoints.length > 0 ? 'MONITORING' : 'REVIEW';
    await prisma.endpoint.update({
      where: { id },
      data: { status: finalStatus },
    });

    return NextResponse.json({
      message: 'Analysis complete',
      discoveredEndpoints: results.discoveredEndpoints.length,
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

