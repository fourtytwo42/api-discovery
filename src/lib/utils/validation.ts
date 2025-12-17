import { z } from 'zod';

// URL validation schema
export const urlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },
  { message: 'URL must be a valid HTTP or HTTPS URL' }
);

// Email validation schema
export const emailSchema = z.string().email();

// SSRF prevention - block private IPs and localhost
const PRIVATE_IP_RANGES = [
  /^127\./, // 127.0.0.0/8
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^169\.254\./, // 169.254.0.0/16 (link-local)
  /^::1$/, // IPv6 localhost
  /^fc00:/, // IPv6 private
  /^fe80:/, // IPv6 link-local
];

export function isPrivateIP(hostname: string): boolean {
  // Check if hostname is localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // Check against private IP ranges
  return PRIVATE_IP_RANGES.some((range) => range.test(hostname));
}

export function validateProxyUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    
    // Validate protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }

    // Check for private IPs (SSRF prevention)
    if (isPrivateIP(parsed.hostname)) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }

    // Check blocked domains from environment
    const blockedDomains = process.env.BLOCKED_PROXY_DOMAINS?.split(',') || [];
    const hostnameLower = parsed.hostname.toLowerCase();
    
    for (const blocked of blockedDomains) {
      const blockedTrimmed = blocked.trim().toLowerCase();
      if (hostnameLower === blockedTrimmed || hostnameLower.endsWith(`.${blockedTrimmed}`)) {
        return { valid: false, error: 'Domain is blocked' };
      }
    }

    // Check allowed domains if specified
    const allowedDomains = process.env.ALLOWED_PROXY_DOMAINS?.split(',') || [];
    if (allowedDomains.length > 0 && allowedDomains[0].trim() !== '') {
      const hostnameLower = parsed.hostname.toLowerCase();
      const isAllowed = allowedDomains.some((allowed) => {
        const allowedTrimmed = allowed.trim().toLowerCase();
        return hostnameLower === allowedTrimmed || hostnameLower.endsWith(`.${allowedTrimmed}`);
      });
      
      if (!isAllowed) {
        return { valid: false, error: 'Domain is not in allowed list' };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// Registration validation schema
export const registerSchema = z.object({
  email: emailSchema,
  username: z.string().min(3).max(30).optional(),
  password: z.string().min(8).max(100),
});

// Login validation schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

