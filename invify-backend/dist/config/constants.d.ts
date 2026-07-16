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
export declare const SYSTEM_TENANT_UUID = "00000000-0000-0000-0000-000000000001";
/**
 * SYSTEM_USER_UUID — synthetic user UUID used in mock bypass sessions.
 * Maps to the dev super-admin account (f47ac10b-...) in local environments.
 */
export declare const SYSTEM_USER_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
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
export declare function isMockAuthAllowed(): boolean;
/**
 * isMockTokenAllowed — guard specifically for Bearer-token mock bypasses
 * (mock-super-admin, mock-agent-token-*, etc.)
 *
 * Slightly broader than isMockAuthAllowed: allows any local/test request
 * with a recognised mock token header regardless of OFFLINE_LOCAL_AUTH.
 */
export declare function isMockTokenAllowed(): boolean;
