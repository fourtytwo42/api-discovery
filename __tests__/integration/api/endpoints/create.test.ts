import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/v1/endpoints/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import * as authMiddleware from '@/lib/auth/middleware';
import * as creditValidation from '@/lib/credits/validation';
import * as creditTransactions from '@/lib/credits/transactions';

vi.mock('@/lib/auth/middleware');
vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    endpoint: { create: vi.fn() },
  },
}));
vi.mock('@/lib/credits/validation');
vi.mock('@/lib/credits/transactions');
vi.mock('@/lib/audit/middleware', () => ({
  logAuditEvent: vi.fn(),
  getClientInfo: vi.fn(() => ({ ipAddress: null, userAgent: null })),
}));

describe('POST /api/v1/endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create endpoint with free tier', async () => {
    vi.mocked(authMiddleware.authenticateRequest).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
    } as any);

    vi.mocked(creditValidation.shouldChargeCredits).mockResolvedValue(false);
    vi.mocked(creditValidation.getCreditsToCharge).mockResolvedValue(0);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ credits: 100 } as any);
    vi.mocked(prisma.endpoint.create).mockResolvedValue({
      id: 'ep-123',
      userId: 'user-123',
      destinationUrl: 'https://api.example.com',
      proxyUrl: '/proxy/ep-123',
      status: 'ACTIVE',
    } as any);

    const request = new NextRequest('http://localhost/api/v1/endpoints', {
      method: 'POST',
      body: JSON.stringify({
        destinationUrl: 'https://api.example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.endpoint).toBeDefined();
  });

  it('should charge credits when free tier exhausted', async () => {
    vi.mocked(authMiddleware.authenticateRequest).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
    } as any);

    vi.mocked(creditValidation.shouldChargeCredits).mockResolvedValue(true);
    vi.mocked(creditValidation.getCreditsToCharge).mockResolvedValue(25);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ credits: 100 } as any);
    vi.mocked(prisma.endpoint.create).mockResolvedValue({
      id: 'ep-123',
      userId: 'user-123',
      destinationUrl: 'https://api.example.com',
      proxyUrl: '/proxy/ep-123',
      status: 'ACTIVE',
    } as any);
    vi.mocked(creditTransactions.deductCredits).mockResolvedValue({
      success: true,
      balanceAfter: 75,
    });

    const request = new NextRequest('http://localhost/api/v1/endpoints', {
      method: 'POST',
      body: JSON.stringify({
        destinationUrl: 'https://api.example.com',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(creditTransactions.deductCredits).toHaveBeenCalled();
  });

  it('should reject private IP URLs', async () => {
    vi.mocked(authMiddleware.authenticateRequest).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
    } as any);

    const request = new NextRequest('http://localhost/api/v1/endpoints', {
      method: 'POST',
      body: JSON.stringify({
        destinationUrl: 'http://127.0.0.1',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

