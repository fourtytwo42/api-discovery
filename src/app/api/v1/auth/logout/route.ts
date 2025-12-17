import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { logAuditEvent, getClientInfo } from '@/lib/audit/middleware';

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if ('error' in authResult) {
    // Still clear cookie even if not authenticated
    const response = NextResponse.json({ message: 'Logged out' });
    response.cookies.delete('token');
    return response;
  }

  // Log audit event
  const clientInfo = getClientInfo(request);
  await logAuditEvent({
    userId: authResult.user.id,
    userEmail: authResult.user.email,
    action: 'USER_LOGOUT',
    resourceType: 'USER',
    resourceId: authResult.user.id,
    ...clientInfo,
  });

  // Clear cookie
  const response = NextResponse.json({ message: 'Logged out' });
  response.cookies.delete('token');
  return response;
}

