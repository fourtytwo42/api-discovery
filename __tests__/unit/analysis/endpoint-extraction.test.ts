import { describe, it, expect } from 'vitest';
import { extractEndpointPatterns, extractQueryParams } from '@/lib/analysis/endpoint-extraction';

describe('Endpoint Extraction', () => {
  describe('extractEndpointPatterns', () => {
    it('should extract patterns from URLs', () => {
      const calls = [
        { method: 'GET', url: 'https://api.example.com/users/123' },
        { method: 'GET', url: 'https://api.example.com/users/456' },
        { method: 'POST', url: 'https://api.example.com/users' },
      ];

      const patterns = extractEndpointPatterns(calls);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some((p) => p.pattern.includes('/users/:id'))).toBe(true);
    });

    it('should handle UUIDs', () => {
      const calls = [
        { method: 'GET', url: 'https://api.example.com/users/550e8400-e29b-41d4-a716-446655440000' },
        { method: 'GET', url: 'https://api.example.com/users/6ba7b810-9dad-11d1-80b4-00c04fd430c8' },
      ];

      const patterns = extractEndpointPatterns(calls);
      expect(patterns.some((p) => p.pattern.includes('/users/:id'))).toBe(true);
    });

    it('should group methods by pattern', () => {
      const calls = [
        { method: 'GET', url: 'https://api.example.com/users/123' },
        { method: 'POST', url: 'https://api.example.com/users' },
        { method: 'PUT', url: 'https://api.example.com/users/123' },
      ];

      const patterns = extractEndpointPatterns(calls);
      const userPattern = patterns.find((p) => p.pattern.includes('/users'));
      expect(userPattern?.methods).toContain('GET');
      expect(userPattern?.methods).toContain('POST');
    });
  });

  describe('extractQueryParams', () => {
    it('should extract query parameters', () => {
      const url = 'https://api.example.com/users?page=1&limit=10';
      const params = extractQueryParams(url);
      expect(params.page).toBe('1');
      expect(params.limit).toBe('10');
    });

    it('should return empty object for URLs without params', () => {
      const url = 'https://api.example.com/users';
      const params = extractQueryParams(url);
      expect(Object.keys(params).length).toBe(0);
    });
  });
});

