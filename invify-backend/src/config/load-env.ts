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

export function resolveSystemEnvFileCandidates(): string[] {
  const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
  if (nodeEnv === 'production') return ['/etc/invify/invify-production.env'];
  if (nodeEnv === 'staging') {
    return ['/etc/invify/invify-staging.env', '/etc/invify/invify.env'];
  }
  return [];
}

function envValue(name: string): string {
  return String(process.env[name] || '').trim();
}

function applyParsedIfEmpty(parsed?: Record<string, string>) {
  if (!parsed) return;
  for (const [key, value] of Object.entries(parsed)) {
    if (!envValue(key) && String(value || '').trim()) {
      process.env[key] = value;
    }
  }
}

function applySecretAliases() {
  const copies: Array<[string, string]> = [
    ['STAGING_JWT_SECRET', 'JWT_SECRET'],
    ['STAGING_SUPABASE_JWT_SECRET', 'SUPABASE_JWT_SECRET'],
    ['STAGING_LICENSE_HMAC_SECRET', 'LICENSE_HMAC_SECRET'],
    ['STAGING_QUASAR_WEBHOOK_SIGNING_SECRET', 'QUASAR_WEBHOOK_SIGNING_SECRET'],
    ['SUPABASE_KEY', 'STAGING_SUPABASE_KEY'],
    ['SUPABASE_KEY', 'STAGING_SUPABASE_PUBLISHABLE_KEY'],
    ['SUPABASE_KEY', 'STAGING_SUPABASE_SECRET_KEY'],
    ['SUPABASE_URL', 'STAGING_SUPABASE_URL'],
    ['AWS_ACCESS_KEY_ID', 'CONTABO_ACCESS_KEY'],
    ['CONTABO_ACCESS_KEY_ID', 'CONTABO_ACCESS_KEY'],
    ['AWS_SECRET_ACCESS_KEY', 'CONTABO_SECRET_KEY'],
    ['CONTABO_SECRET_ACCESS_KEY', 'CONTABO_SECRET_KEY'],
  ];
  for (const [from, to] of copies) {
    if (!envValue(to) && envValue(from)) {
      process.env[to] = process.env[from];
    }
  }
}

/**
 * Load the environment file that matches NODE_ENV.
 * Safe to call more than once. Does not override non-empty variables already set in the process.
 * Empty systemd placeholders are filled from later files. Windows Explorer often saves
 * `.env.staging` as `env.staging` — both are accepted.
 */
export function loadEnv(): string {
  if (loadedFile) return loadedFile;

  const cwd = process.cwd();
  const candidates = [
    ...resolveSystemEnvFileCandidates(),
    ...resolveEnvFileCandidates().map((envFile) => path.resolve(cwd, envFile)),
  ];
  const loaded: string[] = [];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const result = dotenv.config({ path: envPath });
    applyParsedIfEmpty(result.parsed);
    loaded.push(envPath);
  }

  applySecretAliases();

  if (loaded.length > 0) {
    loadedFile = loaded[0];
    const names = loaded.map((item) => path.basename(item)).join(', ');
    if (names.includes('env.staging') && !names.includes('.env.staging')) {
      console.warn('[env] Loaded env.staging. Rename it to .env.staging so it stays gitignored.');
    } else {
      console.log(`[env] Loaded ${names}`);
    }
    return loadedFile;
  }

  console.warn(
    `[env] ${resolveEnvFileCandidates()[0]} not found in ${cwd}. Staging/production require scoped secrets ` +
      `(copy ${resolveEnvFileCandidates()[0]}.example to ${resolveEnvFileCandidates()[0]}).`,
  );

  const fallback = dotenv.config();
  applyParsedIfEmpty(fallback.parsed);
  applySecretAliases();
  loadedFile = '.env';
  return loadedFile;
}
