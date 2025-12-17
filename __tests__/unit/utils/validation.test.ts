import { describe, it, expect } from 'vitest';
import {
  urlSchema,
  emailSchema,
  isPrivateIP,
  validateProxyUrl,
  registerSchema,
  loginSchema,
} from '@/lib/utils/validation';

describe('Validation Utilities', () => {
  describe('urlSchema', () => {
    it('should validate valid HTTP URLs', () => {
      expect(() => urlSchema.parse('http://example.com')).not.toThrow();
      expect(() => urlSchema.parse('https://example.com')).not.toThrow();
    });

    it('should reject invalid URLs', () => {
      expect(() => urlSchema.parse('not-a-url')).toThrow();
      expect(() => urlSchema.parse('ftp://example.com')).toThrow();
    });
  });

  describe('emailSchema', () => {
    it('should validate valid emails', () => {
      expect(() => emailSchema.parse('test@example.com')).not.toThrow();
      expect(() => emailSchema.parse('user.name@example.co.uk')).not.toThrow();
    });

    it('should reject invalid emails', () => {
      expect(() => emailSchema.parse('not-an-email')).toThrow();
      expect(() => emailSchema.parse('@example.com')).toThrow();
    });
  });

  describe('isPrivateIP', () => {
    it('should detect localhost', () => {
      expect(isPrivateIP('localhost')).toBe(true);
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('::1')).toBe(true);
    });

    it('should detect private IP ranges', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('192.168.1.1')).toBe(true);
      expect(isPrivateIP('169.254.0.1')).toBe(true);
    });

    it('should allow public IPs', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
      expect(isPrivateIP('example.com')).toBe(false);
    });
  });

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
      expect(result.error).toContain('HTTP and HTTPS');
    });

    it('should reject invalid URLs', () => {
      const result = validateProxyUrl('not-a-url');
      expect(result.valid).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const valid = {
        email: 'test@example.com',
        password: 'password123',
      };
      expect(() => registerSchema.parse(valid)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalid = {
        email: 'not-an-email',
        password: 'password123',
      };
      expect(() => registerSchema.parse(invalid)).toThrow();
    });

    it('should reject short password', () => {
      const invalid = {
        email: 'test@example.com',
        password: 'short',
      };
      expect(() => registerSchema.parse(invalid)).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const valid = {
        email: 'test@example.com',
        password: 'password123',
      };
      expect(() => loginSchema.parse(valid)).not.toThrow();
    });

    it('should reject empty password', () => {
      const invalid = {
        email: 'test@example.com',
        password: '',
      };
      expect(() => loginSchema.parse(invalid)).toThrow();
    });
  });
});

