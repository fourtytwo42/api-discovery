import { NextRequest } from 'next/server';
import { prisma } from '../database/prisma';
import { Prisma } from '@prisma/client';

export interface AuditLogData {
  userId?: string;
  userEmail?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        action: data.action,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        details: data.details ? (data.details as Prisma.InputJsonValue) : undefined,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should not break the application
    console.error('Failed to log audit event:', error);
  }
}

export function getClientInfo(request: NextRequest): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    null;
  
  const userAgent = request.headers.get('user-agent') || null;

  return { ipAddress, userAgent };
}

