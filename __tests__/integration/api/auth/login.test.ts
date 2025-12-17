import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/v1/auth/login/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import * as passwordUtils from '@/lib/auth/password';

// Mock dependencies
vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn(),
}));

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login with valid credentials', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed',
      role: 'USER',
      enabled: true,
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);
    vi.mocked(passwordUtils.verifyPassword).mockResolvedValue(true);

    const request = new NextRequest('http://localhost/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toBeDefined();
    expect(response.cookies.get('token')).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed',
      enabled: true,
    } as any);
    vi.mocked(passwordUtils.verifyPassword).mockResolvedValue(false);

    const request = new NextRequest('http://localhost/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should reject disabled account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      enabled: false,
    } as any);

    const request = new NextRequest('http://localhost/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});

