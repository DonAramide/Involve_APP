/**
 * Authentication rate-limit defaults.
 * Production may override with RATE_LIMIT_AUTH_MAX / RATE_LIMIT_AUTH_WINDOW_MS.
 * The previous source default of 10_000 / 15 minutes was not an effective
 * credential-stuffing control. POS/sync traffic uses the separate global limiter.
 */
export const AUTH_RATE_LIMIT_DEFAULT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_DEFAULT_MAX = 40;
