import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAuditEvent, getClientInfo } from '@/lib/audit/middleware';
import { NextRequest } from 'next/server';

// Mock prisma
vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe('Audit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logAuditEvent', () => {
    it('should log audit event', async () => {
      const { prisma } = await import('@/lib/database/prisma');
      
      await logAuditEvent({
        userId: 'user-123',
        action: 'TEST_ACTION',
        resourceType: 'TEST',
        resourceId: 'resource-123',
      });

      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should handle null userId', async () => {
      const { prisma } = await import('@/lib/database/prisma');
      
      await logAuditEvent({
        action: 'SYSTEM_ACTION',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          action: 'SYSTEM_ACTION',
        }),
      });
    });

    it('should not throw on error', async () => {
      const { prisma } = await import('@/lib/database/prisma');
      vi.spyOn(prisma.auditLog, 'create').mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(
        logAuditEvent({ action: 'TEST' })
      ).resolves.not.toThrow();
    });
  });

  describe('getClientInfo', () => {
    it('should extract IP from x-forwarded-for', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      const info = getClientInfo(request);
      expect(info.ipAddress).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'x-real-ip': '192.168.1.1',
        },
      });

      const info = getClientInfo(request);
      expect(info.ipAddress).toBe('192.168.1.1');
    });

    it('should extract user agent', () => {
      const request = new NextRequest('http://localhost', {
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      });

      const info = getClientInfo(request);
      expect(info.userAgent).toBe('Mozilla/5.0');
    });

    it('should return null when headers missing', () => {
      const request = new NextRequest('http://localhost');
      const info = getClientInfo(request);
      expect(info.ipAddress).toBeNull();
      expect(info.userAgent).toBeNull();
    });
  });
});

