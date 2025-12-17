import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { handleError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const demoUsers = await prisma.user.findMany({
      where: { isDemo: true },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
      take: 10,
    });

    return NextResponse.json({ demoUsers });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(
      { error: handled.message },
      { status: handled.statusCode }
    );
  }
}

