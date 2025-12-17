import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { prisma } from '@/lib/database/prisma';
import { validateProxyUrl } from '@/lib/utils/validation';
import { getCreditsToCharge, shouldChargeCredits } from '@/lib/credits/validation';
import { deductCredits } from '@/lib/credits/transactions';
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors';
import { logAuditEvent, getClientInfo } from '@/lib/audit/middleware';
import { z } from 'zod';

const createEndpointSchema = z.object({
  name: z.string().optional(),
  destinationUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    const body = await request.json();
    const validated = createEndpointSchema.parse(body);

    // Validate URL (SSRF prevention)
    const urlValidation = validateProxyUrl(validated.destinationUrl);
    if (!urlValidation.valid) {
      throw new ValidationError(urlValidation.error || 'Invalid URL');
    }

    // Check if should charge credits
    const creditsToCharge = await getCreditsToCharge(authResult.user.id);
    const hasFreeTier = !(await shouldChargeCredits(authResult.user.id));

    // Check user has enough credits if charging
    if (creditsToCharge > 0) {
      const user = await prisma.user.findUnique({
        where: { id: authResult.user.id },
        select: { credits: true },
      });

      if (!user || user.credits < creditsToCharge) {
        return NextResponse.json(
          { error: 'Insufficient credits' },
          { status: 400 }
        );
      }
    }

    // Create endpoint
    const endpointId = `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const proxyUrl = `/proxy/${endpointId}`;

    const endpoint = await prisma.endpoint.create({
      data: {
        id: endpointId,
        userId: authResult.user.id,
        name: validated.name || null,
        destinationUrl: validated.destinationUrl,
        proxyUrl,
        status: 'ACTIVE',
        creditsUsed: creditsToCharge,
      },
    });

    // Deduct credits if needed
    if (creditsToCharge > 0) {
      await deductCredits(
        authResult.user.id,
        creditsToCharge,
        `Endpoint creation: ${endpointId}`,
        endpointId
      );
    }

    // Log audit event
    const clientInfo = getClientInfo(request);
    await logAuditEvent({
      userId: authResult.user.id,
      userEmail: authResult.user.email,
      action: 'ENDPOINT_CREATED',
      resourceType: 'ENDPOINT',
      resourceId: endpointId,
      details: { destinationUrl: validated.destinationUrl, creditsUsed: creditsToCharge },
      ...clientInfo,
    });

    return NextResponse.json({ endpoint }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
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

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const [endpoints, total] = await Promise.all([
      prisma.endpoint.findMany({
        where: { userId: authResult.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          destinationUrl: true,
          proxyUrl: true,
          status: true,
          creditsUsed: true,
          createdAt: true,
          updatedAt: true,
          lastUsedAt: true,
        },
      }),
      prisma.endpoint.count({
        where: { userId: authResult.user.id },
      }),
    ]);

    return NextResponse.json({
      endpoints,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(
      { error: handled.message },
      { status: handled.statusCode }
    );
  }
}

