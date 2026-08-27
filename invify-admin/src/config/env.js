/**
 * Admin environment configuration.
 *
 * Staging/production browser traffic is same-origin (relative paths such as
 * /api/..., /admin/..., /public/...). Nginx proxies those prefixes to the
 * backend. The browser must never receive LAN, loopback, or backend ports.
 *
 * Dev may leave VITE_API_URL empty and use the Vite proxy.
 */

function isProdBuild() {
  return import.meta.env.PROD === true || import.meta.env.MODE === 'production';
}

function isStagingBuild() {
  return import.meta.env.MODE === 'staging' || import.meta.env.VITE_APP_ENV === 'staging';
}

function isSameOriginToken(value) {
  const normalized = value.trim().replace(/\/$/, '');
  return (
    normalized === '' ||
    normalized === '/' ||
    normalized === '/api' ||
    normalized.toLowerCase() === 'same-origin'
  );
}

function assertNotInternalApiTarget(value) {
  const lowered = value.toLowerCase();
  if (
    lowered.includes('192.168.') ||
    lowered.includes('127.0.0.1') ||
    lowered.includes('0.0.0.0') ||
    lowered.includes('localhost') ||
    lowered.includes(':3000') ||
    lowered.includes(':3004')
  ) {
    throw new Error('[AdminConfig] VITE_API_URL must not reference internal hosts or backend ports');
  }
}

function assertPublicHttpsApiOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('[AdminConfig] VITE_API_URL must be a valid absolute HTTPS origin');
  }

  const hostname = parsed.hostname.toLowerCase();
  const loopbackName = ['local', 'host'].join('');
  const tunnelSuffix = ['ng', 'rok'].join('');
  const octets = hostname.split('.').map((part) => Number(part));
  const isIpv4 = octets.length === 4 && octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
  const isPrivateIpv4 =
    isIpv4 &&
    (
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );

  const blockedPort = parsed.port === '3000' || parsed.port === '3004';

  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    hostname === loopbackName ||
    hostname.endsWith('.local') ||
    hostname.includes(tunnelSuffix) ||
    hostname.includes('*') ||
    isPrivateIpv4 ||
    blockedPort
  ) {
    throw new Error('[AdminConfig] VITE_API_URL must use a public HTTPS origin in staging/production');
  }
}

export function resolveApiBaseUrl() {
  const fromEnv = (import.meta.env.VITE_API_URL || '').trim();
  assertNotInternalApiTarget(fromEnv);

  if (isProdBuild() || isStagingBuild()) {
    if (isSameOriginToken(fromEnv)) {
      return '';
    }
    assertPublicHttpsApiOrigin(fromEnv);
    // Same-origin strategy: do not bake a second API host into the browser.
    return '';
  }

  if (isSameOriginToken(fromEnv)) {
    return '';
  }
  return fromEnv.replace(/\/$/, '');
}

export function joinApiUrl(path) {
  const base = resolveApiBaseUrl();
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${suffix}` : suffix;
}

export function publicApiOrigin() {
  const base = resolveApiBaseUrl();
  if (base) return base;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export const ADMIN_APP_ENV = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development';
