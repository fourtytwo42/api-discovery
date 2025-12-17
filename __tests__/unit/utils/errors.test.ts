import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  handleError,
} from '@/lib/utils/errors';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create error with message and status code', () => {
      const error = new AppError('Test error', 400);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBeUndefined();
    });

    it('should create error with code', () => {
      const error = new AppError('Test error', 400, 'TEST_CODE');
      expect(error.code).toBe('TEST_CODE');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Validation failed', {
        email: ['Invalid email'],
      });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fields).toEqual({ email: ['Invalid email'] });
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new AuthorizationError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error', () => {
      const error = new NotFoundError('User');
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('handleError', () => {
    it('should handle AppError', () => {
      const error = new AppError('Test error', 400, 'TEST_CODE');
      const result = handleError(error);
      expect(result.message).toBe('Test error');
      expect(result.statusCode).toBe(400);
      expect(result.code).toBe('TEST_CODE');
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');
      const result = handleError(error);
      expect(result.message).toBe('Generic error');
      expect(result.statusCode).toBe(500);
      expect(result.code).toBe('INTERNAL_ERROR');
    });

    it('should handle unknown error', () => {
      const result = handleError('string error');
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.statusCode).toBe(500);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });
});

