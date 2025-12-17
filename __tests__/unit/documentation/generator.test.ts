import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDocumentation } from '@/lib/documentation/generator';
import { prisma } from '@/lib/database/prisma';

vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    endpoint: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Documentation Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate markdown documentation', async () => {
    vi.mocked(prisma.endpoint.findUnique).mockResolvedValue({
      id: 'ep-123',
      discoveredEndpoints: [
        {
          pattern: '/api/users/:id',
          methods: ['GET'],
          description: 'Get user by ID',
          requestSchema: null,
          responseSchemas: { '200': { type: 'object' } },
          authRequired: true,
          authType: 'Bearer',
        },
      ],
    } as any);

    const result = await generateDocumentation('ep-123');
    expect(result.markdown).toContain('# API Documentation');
    expect(result.markdown).toContain('/api/users/:id');
  });

  it('should generate OpenAPI spec', async () => {
    vi.mocked(prisma.endpoint.findUnique).mockResolvedValue({
      id: 'ep-123',
      discoveredEndpoints: [
        {
          pattern: '/api/users',
          methods: ['GET'],
          description: null,
          requestSchema: null,
          responseSchemas: null,
          authRequired: false,
          authType: null,
        },
      ],
    } as any);

    const result = await generateDocumentation('ep-123');
    expect(result.openApiSpec).toContain('openapi');
    expect(result.openApiSpec).toContain('3.1.0');
  });

  it('should generate TypeScript types', async () => {
    vi.mocked(prisma.endpoint.findUnique).mockResolvedValue({
      id: 'ep-123',
      discoveredEndpoints: [
        {
          pattern: '/api/users',
          methods: ['GET'],
          description: null,
          requestSchema: { type: 'object', properties: { name: { type: 'string' } } },
          responseSchemas: { '200': { type: 'object' } },
          authRequired: false,
          authType: null,
        },
      ],
    } as any);

    const result = await generateDocumentation('ep-123');
    expect(result.typescriptTypes).toContain('export interface');
  });
});

