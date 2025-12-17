import { describe, it, expect } from 'vitest';
import { detectPatterns } from '@/lib/analysis/pattern-detection';

describe('Pattern Detection', () => {
  it('should detect Bearer authentication', () => {
    const calls = [
      {
        method: 'GET',
        requestHeaders: { authorization: 'Bearer token123' },
        responseHeaders: {},
      },
    ];

    const patterns = detectPatterns(calls);
    expect(patterns.authRequired).toBe(true);
    expect(patterns.authType).toBe('Bearer');
  });

  it('should detect pagination', () => {
    const calls = [
      {
        method: 'GET',
        requestHeaders: {},
        responseHeaders: {},
        queryParams: { page: '1', limit: '10' },
      },
    ];

    const patterns = detectPatterns(calls);
    expect(patterns.paginationType).toBe('page');
  });

  it('should detect REST API type', () => {
    const calls = [
      {
        method: 'GET',
        requestHeaders: {},
        responseHeaders: { 'content-type': 'application/json' },
      },
    ];

    const patterns = detectPatterns(calls);
    expect(patterns.apiType).toBe('REST');
  });

  it('should extract CORS headers', () => {
    const calls = [
      {
        method: 'GET',
        requestHeaders: {},
        responseHeaders: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST',
        },
      },
    ];

    const patterns = detectPatterns(calls);
    expect(patterns.corsConfig).toBeDefined();
    expect(patterns.corsConfig?.['access-control-allow-origin']).toBe('*');
  });
});

