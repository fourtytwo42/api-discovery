import { describe, it, expect, vi } from 'vitest';
import { captureRequest, captureResponse, truncateString } from '@/lib/proxy/capture';
import { IncomingMessage, ServerResponse } from 'http';

describe('Proxy Capture', () => {
  describe('captureRequest', () => {
    it('should capture GET request', async () => {
      const mockReq = {
        method: 'GET',
        url: '/api/test?param=value',
        headers: {
          host: 'example.com',
          'content-type': 'application/json',
        },
      } as unknown as IncomingMessage;

      // Mock URL parsing
      vi.spyOn(global, 'URL').mockImplementation((url, base) => {
        const urlObj = new URL(url, base || 'http://example.com');
        return urlObj;
      });

      const result = await captureRequest(mockReq);
      expect(result.method).toBe('GET');
      expect(result.headers.host).toBe('example.com');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      const long = 'a'.repeat(100);
      const result = truncateString(long, 50);
      expect(result.length).toBe(50);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should not truncate short strings', () => {
      const short = 'short';
      expect(truncateString(short, 50)).toBe(short);
    });
  });
});

