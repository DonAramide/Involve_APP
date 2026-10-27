// src/config/constants.ts
// ---------------------------------------------------------------------------
// Platform-wide constants.
// Do NOT import heavy services here — this file must be side-effect free.
// ---------------------------------------------------------------------------

import { BuildVariantService } from './build-variant';

// ---------------------------------------------------------------------------
// Identity Sentinels
// ---------------------------------------------------------------------------

/**
 * SYSTEM_TENANT_UUID — canonical sentinel UUID for the super-admin / system scope.
 *
 * Replaces the legacy string literal 'global' everywhere a tenantId field is
 * required but the actor operates at the platform level (no tenant affiliation).
 *
 * This value is intentionally a nil-adjacent UUID (all zeros except the last
 * segment) so that it is visually recognisable in logs and DB queries.
 *
 * ⚠️  NEVER use this value to filter RLS-protected tables. Super-admin reads
 *     must continue through supabaseAdmin (service-role), which bypasses RLS.
 */
export const SYSTEM_TENANT_UUID = '00000000-0000-0000-0000-000000000001';

/**
 * SYSTEM_USER_UUID — synthetic user UUID used in mock bypass sessions.
 * Maps to the dev super-admin account (f47ac10b-...) in local environments.
 */
export const SYSTEM_USER_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

// ---------------------------------------------------------------------------
// Mock Auth Guard
// ---------------------------------------------------------------------------

/**
 * isMockAuthAllowed — single authoritative guard for all developer bypass paths.
 *
 * Returns true ONLY when:
 *  - BUILD_VARIANT is LOCAL (default when no env var is set), AND
 *  - OFFLINE_LOCAL_AUTH is 'true', OR we are in a test environment.
 *
 * This function is intentionally synchronous and has no side effects.
 *
 * IMPORTANT: Always check this before any 'Bearer mock-*' token bypass,
 * OFFLINE_LOCAL_AUTH shortcut, or connection-timeout fallback grant.
 */
export function isMockAuthAllowed(): boolean {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'production' ||
    process.env.BUILD_PROFILE === 'production'
  ) {
    return false;
  }

  const variantService = BuildVariantService.getInstance();
  // Explicitly reject staging and production — no exception.
  if (variantService.isStaging() || variantService.isProd()) {
    return false;
  }
  // Local: require OFFLINE_LOCAL_AUTH explicitly (NODE_ENV=test does NOT enable blanket auth bypass)
  return process.env.OFFLINE_LOCAL_AUTH === 'true';
}

/**
 * isMockTokenAllowed — guard specifically for Bearer-token mock bypasses
 * (mock-super-admin, mock-agent-token-*, etc.)
 *
 * Slightly broader than isMockAuthAllowed: allows any local/test request
 * with a recognised mock token header regardless of OFFLINE_LOCAL_AUTH.
 */
export function isMockTokenAllowed(): boolean {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'production' ||
    process.env.BUILD_PROFILE === 'production'
  ) {
    return false;
  }

  const variantService = BuildVariantService.getInstance();
  if (variantService.isStaging() || variantService.isProd()) {
    return false;
  }
  return variantService.isLocal() || process.env.NODE_ENV === 'test';
}

/** True for loopback / RFC1918 clients talking to a non-production Node process. */
export function isPrivateLanIp(ip?: string | null): boolean {
  if (!ip) return false;
  const n = String(ip).replace(/^::ffff:/, '');
  return (
    n === '127.0.0.1' ||
    n === '::1' ||
    n.startsWith('10.') ||
    n.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(n)
  );
}
