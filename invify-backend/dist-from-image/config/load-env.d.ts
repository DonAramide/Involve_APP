export declare function resolveEnvFileCandidates(): string[];
export declare function resolveSystemEnvFileCandidates(): string[];
/**
 * Load the environment file that matches NODE_ENV.
 * Safe to call more than once. Does not override non-empty variables already set in the process.
 * Staging/production do not merge mixed developer `.env` / `env` files (those still carry
 * legacy SUPABASE_SERVICE_ROLE_KEY names that SecurityBoot rejects).
 */
export declare function loadEnv(): string;
