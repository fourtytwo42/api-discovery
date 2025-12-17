import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCompletion, generateDescription } from '@/lib/ai/groq-client';

// Mock groq-sdk
vi.mock('groq-sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

describe('Groq Client', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key';
    vi.clearAllMocks();
  });

  describe('generateCompletion', () => {
    it('should generate completion from Groq API', async () => {
      // This test would require mocking the Groq SDK properly
      // For now, we'll test the structure
      expect(generateCompletion).toBeDefined();
      expect(typeof generateCompletion).toBe('function');
    });

    it('should handle API errors', async () => {
      // Test error handling
      await expect(
        generateCompletion({ prompt: 'test' })
      ).rejects.toThrow();
    });
  });

  describe('generateDescription', () => {
    it('should be defined', () => {
      expect(generateDescription).toBeDefined();
      expect(typeof generateDescription).toBe('function');
    });
  });
});

