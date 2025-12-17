export interface EndpointPattern {
  pattern: string;
  methods: string[];
  examples: string[];
}

/**
 * Extract endpoint patterns from captured API calls
 * Converts URLs like /api/users/123 to /api/users/:id
 */
export function extractEndpointPatterns(apiCalls: Array<{ method: string; url: string }>): EndpointPattern[] {
  const patternMap = new Map<string, { methods: Set<string>; examples: string[] }>();

  for (const call of apiCalls) {
    const pattern = normalizeUrlPattern(call.url);
    
    if (!patternMap.has(pattern)) {
      patternMap.set(pattern, { methods: new Set(), examples: [] });
    }

    const entry = patternMap.get(pattern)!;
    entry.methods.add(call.method);
    if (entry.examples.length < 5) {
      entry.examples.push(call.url);
    }
  }

  return Array.from(patternMap.entries()).map(([pattern, data]) => ({
    pattern,
    methods: Array.from(data.methods),
    examples: data.examples,
  }));
}

/**
 * Normalize URL to pattern by replacing IDs with :param
 */
function normalizeUrlPattern(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Replace UUIDs with :id
    let normalized = path.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id'
    );

    // Replace numeric IDs with :id
    normalized = normalized.replace(/\/\d+\//g, '/:id/');
    normalized = normalized.replace(/\/\d+$/g, '/:id');

    // Replace hex IDs with :id
    normalized = normalized.replace(/\/[0-9a-f]{24,}\//gi, '/:id/');
    normalized = normalized.replace(/\/[0-9a-f]{24,}$/gi, '/:id');

    return normalized;
  } catch {
    // Invalid URL, return as-is
    return url;
  }
}

/**
 * Extract query parameters from URL
 */
export function extractQueryParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

