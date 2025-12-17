export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: unknown[];
}

/**
 * Infer JSON Schema from sample data
 */
export function inferSchema(samples: unknown[]): JsonSchema | null {
  if (samples.length === 0) return null;

  // Get first non-null sample
  const firstSample = samples.find((s) => s !== null && s !== undefined);
  if (!firstSample) return null;

  return inferSchemaFromValue(firstSample, samples);
}

function inferSchemaFromValue(value: unknown, allSamples: unknown[]): JsonSchema {
  if (value === null || value === undefined) {
    return { type: 'null' };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: 'array', items: { type: 'string' } }; // Default to string
    }
    const itemSchemas = value.map((item) => inferSchemaFromValue(item, [item]));
    const unifiedItemSchema = unifySchemas(itemSchemas);
    return { type: 'array', items: unifiedItemSchema };
  }

  if (typeof value === 'object') {
    const schema: JsonSchema = { type: 'object', properties: {} };
    const required: string[] = [];

    const allObjects = allSamples.filter((s) => typeof s === 'object' && s !== null && !Array.isArray(s)) as Record<string, unknown>[];

    // Collect all keys from all samples
    const allKeys = new Set<string>();
    allObjects.forEach((obj) => {
      Object.keys(obj).forEach((key) => allKeys.add(key));
    });

    // Infer schema for each key
    allKeys.forEach((key) => {
      const keySamples = allObjects
        .map((obj) => obj[key])
        .filter((v) => v !== undefined);

      if (keySamples.length > 0) {
        const keySchema = inferSchemaFromValue(keySamples[0], keySamples);
        if (schema.properties) {
          schema.properties[key] = keySchema;
        }

        // Check if key is required (present in all samples)
        if (allObjects.every((obj) => key in obj && obj[key] !== undefined)) {
          required.push(key);
        }
      }
    });

    if (required.length > 0) {
      schema.required = required;
    }

    return schema;
  }

  // Primitive types
  if (typeof value === 'string') {
    // Check if it's an enum
    const uniqueValues = new Set(allSamples.filter((s) => typeof s === 'string'));
    if (uniqueValues.size > 1 && uniqueValues.size <= 10) {
      return { type: 'string', enum: Array.from(uniqueValues) };
    }
    return { type: 'string' };
  }

  if (typeof value === 'number') {
    return { type: 'number' };
  }

  if (typeof value === 'boolean') {
    return { type: 'boolean' };
  }

  return { type: 'string' }; // Fallback
}

function unifySchemas(schemas: JsonSchema[]): JsonSchema {
  if (schemas.length === 0) return { type: 'string' };
  if (schemas.length === 1) return schemas[0];

  // Find common type
  const types = new Set(schemas.map((s) => s.type));
  if (types.size === 1) {
    const commonType = Array.from(types)[0];
    if (commonType === 'object') {
      // Merge object schemas
      const merged: JsonSchema = { type: 'object', properties: {} };
      const allKeys = new Set<string>();
      schemas.forEach((s) => {
        if (s.properties) {
          Object.keys(s.properties).forEach((key) => allKeys.add(key));
        }
      });

      allKeys.forEach((key) => {
        const keySchemas = schemas
          .map((s) => s.properties?.[key])
          .filter((s): s is JsonSchema => s !== undefined);
        if (keySchemas.length > 0 && merged.properties) {
          merged.properties[key] = unifySchemas(keySchemas);
        }
      });

      return merged;
    }
    return { type: commonType };
  }

  // Mixed types - default to string
  return { type: 'string' };
}

