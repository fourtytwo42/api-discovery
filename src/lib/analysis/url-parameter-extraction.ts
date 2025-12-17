/**
 * Extract URL parameter values from actual URLs
 * Compares actual URLs against normalized patterns to find parameter values
 */

export interface UrlParameterVariation {
  parameter: string; // e.g., "id"
  position: number; // Position in path segments
  values: Array<{
    value: string;
    count: number;
    exampleUrl: string;
  }>;
}

export interface QueryParameterVariation {
  name: string;
  values: Array<{
    value: string;
    count: number;
    exampleUrl: string;
  }>;
}

export interface PayloadVariation {
  payload: string; // JSON stringified payload
  count: number;
  exampleUrl: string;
  exampleTimestamp: string;
}

/**
 * Extract URL parameter values by comparing actual URL to pattern
 */
export function extractUrlParameterValues(
  actualUrl: string,
  pattern: string
): Record<string, string> {
  try {
    const urlObj = new URL(actualUrl);
    const actualPath = urlObj.pathname;
    const patternPath = pattern;

    // Split paths into segments
    const actualSegments = actualPath.split('/').filter(s => s);
    const patternSegments = patternPath.split('/').filter(s => s);

    const params: Record<string, string> = {};

    // Match segments and extract parameter values
    for (let i = 0; i < Math.max(actualSegments.length, patternSegments.length); i++) {
      const patternSegment = patternSegments[i];
      const actualSegment = actualSegments[i];

      if (patternSegment && patternSegment.startsWith(':')) {
        // This is a parameter
        const paramName = patternSegment.slice(1); // Remove ':'
        if (actualSegment) {
          params[paramName] = actualSegment;
        }
      }
    }

    return params;
  } catch {
    return {};
  }
}

/**
 * Group URL parameter variations from a set of calls
 */
export function groupUrlParameterVariations(
  calls: Array<{ url: string; pattern: string }>
): UrlParameterVariation[] {
  const paramMap = new Map<string, Map<string, { count: number; exampleUrl: string }>>();

  for (const call of calls) {
    const params = extractUrlParameterValues(call.url, call.pattern);
    
    for (const [paramName, paramValue] of Object.entries(params)) {
      if (!paramMap.has(paramName)) {
        paramMap.set(paramName, new Map());
      }
      
      const valueMap = paramMap.get(paramName)!;
      if (!valueMap.has(paramValue)) {
        valueMap.set(paramValue, { count: 0, exampleUrl: call.url });
      }
      
      const entry = valueMap.get(paramValue)!;
      entry.count++;
    }
  }

  // Convert to array format
  return Array.from(paramMap.entries()).map(([parameter, valueMap]) => {
    const values = Array.from(valueMap.entries())
      .map(([value, data]) => ({
        value,
        count: data.count,
        exampleUrl: data.exampleUrl,
      }))
      .sort((a, b) => b.count - a.count); // Sort by frequency

    return {
      parameter,
      position: 0, // Could be calculated if needed
      values,
    };
  });
}

/**
 * Group query parameter variations
 */
export function groupQueryParameterVariations(
  calls: Array<{ url: string; queryParams: Record<string, unknown> | null }>
): QueryParameterVariation[] {
  const paramMap = new Map<string, Map<string, { count: number; exampleUrl: string }>>();

  for (const call of calls) {
    if (!call.queryParams || typeof call.queryParams !== 'object') {
      continue;
    }

    for (const [paramName, paramValue] of Object.entries(call.queryParams)) {
      const valueStr = String(paramValue);
      
      if (!paramMap.has(paramName)) {
        paramMap.set(paramName, new Map());
      }
      
      const valueMap = paramMap.get(paramName)!;
      if (!valueMap.has(valueStr)) {
        valueMap.set(valueStr, { count: 0, exampleUrl: call.url });
      }
      
      const entry = valueMap.get(valueStr)!;
      entry.count++;
    }
  }

  return Array.from(paramMap.entries()).map(([name, valueMap]) => {
    const values = Array.from(valueMap.entries())
      .map(([value, data]) => ({
        value,
        count: data.count,
        exampleUrl: data.exampleUrl,
      }))
      .sort((a, b) => b.count - a.count);

    return { name, values };
  });
}

/**
 * Group payload variations
 */
export function groupPayloadVariations(
  calls: Array<{
    url: string;
    requestBody: string | null;
    requestBodyJson: unknown;
    timestamp: Date | string;
  }>
): PayloadVariation[] {
  const payloadMap = new Map<string, { count: number; exampleUrl: string; exampleTimestamp: string }>();

  for (const call of calls) {
    let payloadStr: string | null = null;

    // Prefer JSON if available, otherwise use raw body
    if (call.requestBodyJson) {
      try {
        payloadStr = JSON.stringify(call.requestBodyJson, null, 2);
      } catch {
        payloadStr = call.requestBody || null;
      }
    } else if (call.requestBody) {
      payloadStr = call.requestBody;
    }

    if (!payloadStr || payloadStr.trim().length === 0) {
      continue;
    }

    // Normalize payload (remove whitespace differences)
    const normalized = payloadStr.trim();

    if (!payloadMap.has(normalized)) {
      payloadMap.set(normalized, {
        count: 0,
        exampleUrl: call.url,
        exampleTimestamp: typeof call.timestamp === 'string' 
          ? call.timestamp 
          : call.timestamp.toISOString(),
      });
    }

    const entry = payloadMap.get(normalized)!;
    entry.count++;
  }

  return Array.from(payloadMap.entries())
    .map(([payload, data]) => ({
      payload,
      count: data.count,
      exampleUrl: data.exampleUrl,
      exampleTimestamp: data.exampleTimestamp,
    }))
    .sort((a, b) => b.count - a.count); // Sort by frequency
}

