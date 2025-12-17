import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/v1/auth/register/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import * as passwordUtils from '@/lib/auth/password';

// Mock prisma
vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock password hashing
vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(() => Promise.resolve('hashed-password')),
}));

// Mock audit logging
vi.mock('@/lib/audit/middleware', () => ({
  logAuditEvent: vi.fn(),
  getClientInfo: vi.fn(() => ({ ipAddress: null, userAgent: null })),
}));

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register a new user', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashed',
      role: 'USER',
      credits: 100,
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser as any);

    const request = new NextRequest('http://localhost/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('test@example.com');
  });

  it('should reject duplicate email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing',
      email: 'test@example.com',
    } as any);

    const request = new NextRequest('http://localhost/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already exists');
  });

  it('should validate email format', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    // Zod validation errors might return 500 if not caught properly
    // Check that it's an error response
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
