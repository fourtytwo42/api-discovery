import { describe, it, expect } from 'vitest';
import { validateProxyUrl, isPrivateIP } from '@/lib/proxy/validation';

describe('Proxy Validation', () => {
  describe('validateProxyUrl', () => {
    it('should validate public HTTP URLs', () => {
      const result = validateProxyUrl('https://api.example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject private IPs', () => {
      const result = validateProxyUrl('http://127.0.0.1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Private IP');
    });

    it('should reject non-HTTP protocols', () => {
      const result = validateProxyUrl('ftp://example.com');
      expect(result.valid).toBe(false);
    });
  });

  describe('isPrivateIP', () => {
    it('should detect localhost', () => {
      expect(isPrivateIP('localhost')).toBe(true);
      expect(isPrivateIP('127.0.0.1')).toBe(true);
    });

    it('should detect private IP ranges', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('192.168.1.1')).toBe(true);
    });

    it('should allow public IPs', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('api.example.com')).toBe(false);
    });
  });
});

