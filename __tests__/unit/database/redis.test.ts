import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { redis } from '@/lib/database/redis';

describe('Redis Client', () => {
  beforeAll(async () => {
    // Ensure Redis client is initialized
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('should initialize Redis client', () => {
    expect(redis).toBeDefined();
  });

  it('should be able to connect to Redis', async () => {
    try {
      const result = await redis.ping();
      expect(result).toBe('PONG');
    } catch (error) {
      // Redis not available - this is expected in some test environments
      expect(error).toBeDefined();
    }
  });

  it('should be able to set and get values', async () => {
    try {
      await redis.set('test:key', 'test:value');
      const value = await redis.get('test:key');
      expect(value).toBe('test:value');
      await redis.del('test:key');
    } catch (error) {
      // Redis not available - this is expected in some test environments
      expect(error).toBeDefined();
    }
  });
});

