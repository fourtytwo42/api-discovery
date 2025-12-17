import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/v1/endpoints/[id]/documentation/export/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import * as authMiddleware from '@/lib/auth/middleware';

vi.mock('@/lib/auth/middleware');
vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    endpoint: {
      findUnique: vi.fn(),
    },
  },
}));

describe('GET /api/v1/endpoints/[id]/documentation/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export markdown documentation', async () => {
    vi.mocked(authMiddleware.authenticateRequest).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
    } as any);

    vi.mocked(prisma.endpoint.findUnique).mockResolvedValue({
      id: 'ep-123',
      userId: 'user-123',
      endpointDocs: [
        {
          markdown: '# API Documentation',
          openApiSpec: '{}',
          typescriptTypes: 'export interface Test {}',
        },
      ],
    } as any);

    const request = new NextRequest('http://localhost/api/v1/endpoints/ep-123/documentation/export?format=markdown');
    const response = await GET(request, { params: Promise.resolve({ id: 'ep-123' }) });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/markdown');
  });

  it('should export OpenAPI spec', async () => {
    vi.mocked(authMiddleware.authenticateRequest).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
    } as any);

    vi.mocked(prisma.endpoint.findUnique).mockResolvedValue({
      id: 'ep-123',
      userId: 'user-123',
      endpointDocs: [
        {
          markdown: '# API Documentation',
          openApiSpec: '{"openapi":"3.1.0"}',
          typescriptTypes: '',
        },
      ],
    } as any);

    const request = new NextRequest('http://localhost/api/v1/endpoints/ep-123/documentation/export?format=openapi');
    const response = await GET(request, { params: Promise.resolve({ id: 'ep-123' }) });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should return 404 if documentation not found', async () => {
    vi.mocked(authMiddleware.authenticateRequest).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
    } as any);

    vi.mocked(prisma.endpoint.findUnique).mockResolvedValue({
      id: 'ep-123',
      userId: 'user-123',
      endpointDocs: [],
    } as any);

    const request = new NextRequest('http://localhost/api/v1/endpoints/ep-123/documentation/export?format=markdown');
    const response = await GET(request, { params: Promise.resolve({ id: 'ep-123' }) });

    expect(response.status).toBe(404);
  });
});

