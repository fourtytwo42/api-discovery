import { IncomingMessage, ServerResponse } from 'http';

const MAX_PAYLOAD_SIZE = parseInt(process.env.PROXY_MAX_PAYLOAD_SIZE || '52428800', 10); // 50MB default

export interface CapturedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  bodyJson?: unknown;
  queryParams?: Record<string, string>;
}

export interface CapturedResponse {
  status?: number;
  headers: Record<string, string>;
  body?: string;
  bodyJson?: unknown;
  duration?: number;
}

export function captureRequest(req: IncomingMessage): Promise<CapturedRequest> {
  return new Promise((resolve, reject) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = req.method || 'GET';
    const headers: Record<string, string> = {};
    
    // Capture headers
    Object.keys(req.headers).forEach((key) => {
      const value = req.headers[key];
      if (value) {
        headers[key] = Array.isArray(value) ? value.join(', ') : value;
      }
    });

    // Capture query parameters
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Capture body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      let body = '';
      let totalSize = 0;

      req.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > MAX_PAYLOAD_SIZE) {
          req.destroy();
          reject(new Error('Request body too large'));
          return;
        }
        body += chunk.toString('utf-8');
      });

      req.on('end', () => {
        let bodyJson: unknown = undefined;
        try {
          if (headers['content-type']?.includes('application/json')) {
            bodyJson = JSON.parse(body);
          }
        } catch {
          // Not JSON, keep as string
        }

        resolve({
          method,
          url: url.toString(),
          headers,
          body: truncateString(body, MAX_PAYLOAD_SIZE),
          bodyJson,
          queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        });
      });

      req.on('error', reject);
    } else {
      resolve({
        method,
        url: url.toString(),
        headers,
        queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      });
    }
  });
}

export function captureResponse(
  res: ServerResponse,
  startTime: number
): Promise<CapturedResponse> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = {};
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    
    let body = '';
    let totalSize = 0;

    // Capture headers
    res.getHeaderNames().forEach((name) => {
      const value = res.getHeader(name);
      if (value) {
        headers[name] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    });

    // Intercept write to capture body
    res.write = function (chunk: Buffer | string, ...args: unknown[]) {
      if (chunk) {
        const chunkStr = Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : chunk;
        totalSize += chunkStr.length;
        if (totalSize <= MAX_PAYLOAD_SIZE) {
          body += chunkStr;
        }
      }
      return originalWrite(chunk, ...args);
    };

    res.end = function (chunk?: Buffer | string, ...args: unknown[]) {
      if (chunk) {
        const chunkStr = Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : chunk;
        totalSize += chunkStr.length;
        if (totalSize <= MAX_PAYLOAD_SIZE) {
          body += chunkStr;
        }
      }

      const duration = Date.now() - startTime;
      let bodyJson: unknown = undefined;

      try {
        if (headers['content-type']?.includes('application/json')) {
          bodyJson = JSON.parse(body);
        }
      } catch {
        // Not JSON, keep as string
      }

      resolve({
        status: res.statusCode,
        headers,
        body: truncateString(body, MAX_PAYLOAD_SIZE),
        bodyJson,
        duration,
      });

      return originalEnd(chunk, ...args);
    };
  });
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

