import { describe, it, expect } from 'vitest';
import {
  generateEndpointDescriptionPrompt,
  generateParameterDescriptionPrompt,
  generateFieldDescriptionPrompt,
} from '@/lib/ai/prompts';

describe('AI Prompts', () => {
  describe('generateEndpointDescriptionPrompt', () => {
    it('should generate prompt with endpoint details', () => {
      const prompt = generateEndpointDescriptionPrompt(
        '/api/users/:id',
        ['GET', 'POST'],
        { type: 'object', properties: { name: { type: 'string' } } },
        { '200': { type: 'object' } }
      );

      expect(prompt).toContain('/api/users/:id');
      expect(prompt).toContain('GET, POST');
      expect(prompt).toContain('Request Schema');
    });

    it('should handle missing schemas', () => {
      const prompt = generateEndpointDescriptionPrompt('/api/users', ['GET']);
      expect(prompt).toContain('No request body');
    });
  });

  describe('generateParameterDescriptionPrompt', () => {
    it('should generate parameter prompt', () => {
      const prompt = generateParameterDescriptionPrompt('userId', 'string', 'User identification');
      expect(prompt).toContain('userId');
      expect(prompt).toContain('string');
    });
  });

  describe('generateFieldDescriptionPrompt', () => {
    it('should generate field prompt', () => {
      const prompt = generateFieldDescriptionPrompt('email', 'string', 'User email address');
      expect(prompt).toContain('email');
      expect(prompt).toContain('string');
    });
  });
});

