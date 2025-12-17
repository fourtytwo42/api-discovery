import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/v1/credits/balance/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import * as authMiddleware from '@/lib/auth/middleware';

vi.mock('@/lib/auth/middleware', () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('GET /api/v1/credits/balance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user credit balance', async () => {
    vi.mocked(authMiddleware.authenticateRequest).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      credits: 100,
    } as any);

    const request = new NextRequest('http://localhost/api/v1/credits/balance');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.credits).toBe(100);
  });

  it('should return 401 if not authenticated', async () => {
    vi.mocked(authMiddleware.authenticateRequest).mockResolvedValue({
      error: { json: () => ({ error: 'Unauthorized' }), status: 401 } as any,
    } as any);

    const request = new NextRequest('http://localhost/api/v1/credits/balance');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});

