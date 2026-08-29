import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

let loadedFile: string | null = null;

export function resolveEnvFileCandidates(): string[] {
  const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
  if (nodeEnv === 'staging') return ['.env.staging', 'env.staging', '.env', 'env'];
  if (nodeEnv === 'production') return ['.env.production', 'env.production', '.env', 'env'];
  return ['.env', 'env', '.env.local', '.env.staging', 'env.staging'];
}

function applyStagingSecretAliases() {
  const aliases: Array<[string, string]> = [
    ['STAGING_JWT_SECRET', 'JWT_SECRET'],
    ['STAGING_SUPABASE_JWT_SECRET', 'SUPABASE_JWT_SECRET'],
    ['STAGING_LICENSE_HMAC_SECRET', 'LICENSE_HMAC_SECRET'],
    ['STAGING_QUASAR_WEBHOOK_SIGNING_SECRET', 'QUASAR_WEBHOOK_SIGNING_SECRET'],
    ['SUPABASE_KEY', 'STAGING_SUPABASE_KEY'],
    ['SUPABASE_KEY', 'STAGING_SUPABASE_PUBLISHABLE_KEY'],
    ['SUPABASE_KEY', 'STAGING_SUPABASE_SECRET_KEY'],
    ['SUPABASE_URL', 'STAGING_SUPABASE_URL'],
  ];
  for (const [from, to] of aliases) {
    if (!process.env[to] && process.env[from]) {
      process.env[to] = process.env[from];
    }
  }
}

/**
 * Load the environment file that matches NODE_ENV.
 * Safe to call more than once. Does not override variables already set in the process.
 * Windows Explorer often saves `.env.staging` as `env.staging` — both are accepted.
 */
export function loadEnv(): string {
  if (loadedFile) return loadedFile;

  const cwd = process.cwd();
  const candidates = resolveEnvFileCandidates();

  for (const envFile of candidates) {
    const envPath = path.resolve(cwd, envFile);
    if (!fs.existsSync(envPath)) continue;
    dotenv.config({ path: envPath });
    applyStagingSecretAliases();
    loadedFile = envFile;
    if (envFile === 'env.staging') {
      console.warn('[env] Loaded env.staging. Rename it to .env.staging so it stays gitignored.');
    } else {
      console.log(`[env] Loaded ${envFile}`);
    }
    return loadedFile;
  }

  console.warn(
    `[env] ${candidates[0]} not found in ${cwd}. Staging/production require scoped secrets ` +
      `(copy ${candidates[0]}.example to ${candidates[0]}).`,
  );

  dotenv.config();
  applyStagingSecretAliases();
  loadedFile = '.env';
  return loadedFile;
}
