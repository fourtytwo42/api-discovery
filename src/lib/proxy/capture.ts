// Utility functions for proxy request/response handling

const MAX_PAYLOAD_SIZE = parseInt(process.env.PROXY_MAX_PAYLOAD_SIZE || '52428800', 10); // 50MB default

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function truncatePayload(payload: string, maxSize: number = MAX_PAYLOAD_SIZE): string {
  return truncateString(payload, maxSize);
}
