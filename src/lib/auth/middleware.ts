import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from './jwt';
import { prisma } from '../database/prisma';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload & { id: string };
}

export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: JWTPayload & { id: string } } | { error: NextResponse }> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || 
                request.cookies.get('token')?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  try {
    const payload = verifyToken(token);
    
    // Verify user still exists and is enabled
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, enabled: true },
    });

    if (!user || !user.enabled) {
      return {
        error: NextResponse.json(
          { error: 'User not found or disabled' },
          { status: 401 }
        ),
      };
    }

    return {
      user: {
        ...payload,
        id: user.id,
      },
    };
  } catch (error) {
    return {
      error: NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      ),
    };
  }
}

export function requireAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authResult = await authenticateRequest(req);
    
    if ('error' in authResult) {
      return authResult.error;
    }

    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = authResult.user;
    
    return handler(authenticatedReq);
  };
}

export function requireAdmin(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return requireAuth(async (req: AuthenticatedRequest) => {
    if (req.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    return handler(req);
  });
}

