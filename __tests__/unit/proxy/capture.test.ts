import { describe, it, expect } from 'vitest';
import { truncateString, truncatePayload } from '@/lib/proxy/capture';

describe('Proxy Capture', () => {
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

  describe('truncatePayload', () => {
    it('should truncate large payloads', () => {
      const large = 'a'.repeat(100000);
      const result = truncatePayload(large, 1000);
      expect(result.length).toBeLessThanOrEqual(1000);
    });
  });
});
