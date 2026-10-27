// invify-backend/src/utils/ssrf-validator.ts
import { URL } from 'url';

/**
 * Validates a user-supplied URL to prevent Server-Side Request Forgery (SSRF).
 * Blocks loopback, private IPv4/IPv6 ranges, link-local, and cloud metadata endpoints.
 */
export function validateSafeUrl(rawUrl: string, allowHttpForLocal: boolean = false): { isValid: boolean; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'URL must be a non-empty string' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }

  const isProd = process.env.NODE_ENV === 'production';
  const allowedProtocols = isProd || !allowHttpForLocal ? ['https:'] : ['https:', 'http:'];

  if (!allowedProtocols.includes(parsed.protocol)) {
    return { isValid: false, error: `Protocol '${parsed.protocol}' is not permitted. Only HTTPS is allowed.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and internal names
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    if (isProd || !allowHttpForLocal) {
      return { isValid: false, error: 'Loopback and internal hostnames are prohibited' };
    }
  }

  // Block Cloud metadata service
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal' || hostname === 'instance-data') {
    return { isValid: false, error: 'Cloud instance metadata endpoints are strictly prohibited' };
  }

  // Check IPv4 ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [_, o1, o2] = ipv4Match.map(Number);

    // Loopback (127.0.0.0/8)
    if (o1 === 127) {
      if (isProd || !allowHttpForLocal) {
        return { isValid: false, error: 'Loopback IP addresses (127.0.0.0/8) are prohibited' };
      }
    }

    // Link-local (169.254.0.0/16)
    if (o1 === 169 && o2 === 254) {
      return { isValid: false, error: 'Link-local addresses (169.254.0.0/16) are prohibited' };
    }

    // Private network ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    if (o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168)) {
      if (isProd) {
        return { isValid: false, error: 'Private RFC 1918 network addresses are prohibited' };
      }
    }

    // Broadcast (255.255.255.255) and 0.0.0.0
    if (o1 === 0 || o1 >= 224) {
      return { isValid: false, error: 'Invalid or multicast/broadcast IP addresses are prohibited' };
    }
  }

  return { isValid: true };
}
