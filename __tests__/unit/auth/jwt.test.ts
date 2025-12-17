import { describe, it, expect, beforeEach } from 'vitest';
import { generateToken, verifyToken, decodeToken, JWTPayload } from '@/lib/auth/jwt';

describe('JWT Utilities', () => {
  const mockPayload: JWTPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'USER',
  };

  beforeEach(() => {
    // Set a test JWT secret
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-tests';
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateToken(mockPayload);
      const token2 = generateToken({ ...mockPayload, userId: 'user-456' });
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    // Note: Expired token test is skipped as it's difficult to test reliably
    // Token expiration is handled by jwt.verify which throws TokenExpiredError
  });

  describe('decodeToken', () => {
    it('should decode a valid token', () => {
      const token = generateToken(mockPayload);
      const decoded = decodeToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockPayload.userId);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });
});

