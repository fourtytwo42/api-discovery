import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enhanceEndpointWithAI, enhanceParameterWithAI, enhanceFieldWithAI } from '@/lib/ai/enhancement';
import * as groqClient from '@/lib/ai/groq-client';

vi.mock('@/lib/ai/groq-client', () => ({
  generateCompletion: vi.fn(),
}));

describe('AI Enhancement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enhanceEndpointWithAI', () => {
    it('should generate AI description', async () => {
      vi.mocked(groqClient.generateCompletion).mockResolvedValue('This endpoint retrieves user data.');

      const description = await enhanceEndpointWithAI('/api/users/:id', ['GET']);
      expect(description).toBe('This endpoint retrieves user data.');
    });

    it('should fallback to programmatic description on error', async () => {
      vi.mocked(groqClient.generateCompletion).mockRejectedValue(new Error('API error'));

      const description = await enhanceEndpointWithAI('/api/users/:id', ['GET']);
      expect(description).toContain('Retrieves');
    });
  });

  describe('enhanceParameterWithAI', () => {
    it('should generate parameter description', async () => {
      vi.mocked(groqClient.generateCompletion).mockResolvedValue('User identifier');

      const description = await enhanceParameterWithAI('userId', 'string', 'User ID');
      expect(description).toBe('User identifier');
    });
  });

  describe('enhanceFieldWithAI', () => {
    it('should generate field description', async () => {
      vi.mocked(groqClient.generateCompletion).mockResolvedValue('User email address');

      const description = await enhanceFieldWithAI('email', 'string', 'User email');
      expect(description).toBe('User email address');
    });
  });
});

