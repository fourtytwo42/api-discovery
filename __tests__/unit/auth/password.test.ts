import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Password Utilities', () => {
  const testPassword = 'test-password-123';

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword(testPassword);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(testPassword);
    });

    it('should produce different hashes for the same password', async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);
      // bcrypt includes salt, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword(testPassword, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword('wrong-password', hash);
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      const isValid = await verifyPassword('', hash);
      expect(isValid).toBe(true);
    });
  });
});

