import { describe, it, expect } from 'vitest';
import { inferSchema } from '@/lib/analysis/schema-inference';

describe('Schema Inference', () => {
  it('should infer string schema', () => {
    const schema = inferSchema(['hello', 'world']);
    expect(schema?.type).toBe('string');
  });

  it('should infer number schema', () => {
    const schema = inferSchema([1, 2, 3]);
    expect(schema?.type).toBe('number');
  });

  it('should infer object schema', () => {
    const schema = inferSchema([
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ]);
    expect(schema?.type).toBe('object');
    expect(schema?.properties?.name?.type).toBe('string');
    expect(schema?.properties?.age?.type).toBe('number');
  });

  it('should infer array schema', () => {
    const schema = inferSchema([['a', 'b'], ['c', 'd']]);
    expect(schema?.type).toBe('array');
    expect(schema?.items?.type).toBe('string');
  });

  it('should detect required fields', () => {
    const schema = inferSchema([
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ]);
    expect(schema?.required).toContain('name');
    expect(schema?.required).toContain('age');
  });

  it('should return null for empty samples', () => {
    const schema = inferSchema([]);
    expect(schema).toBeNull();
  });
});

