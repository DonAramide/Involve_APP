import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

let loadedFile: string | null = null;

const CONTABO_KEYS = [
  'CONTABO_ACCESS_KEY',
  'CONTABO_ACCESS_KEY_ID',
  'CONTABO_SECRET_KEY',
  'CONTABO_SECRET_ACCESS_KEY',
  'CONTABO_ENDPOINT',
  'CONTABO_REGION',
  'CONTABO_BUCKET',
  'CONTABO_UPLOAD_PUBLIC_READ',
  'CONTABO_PUBLIC_BASE_URL',
  'CONTABO_TENANT_ID',
  'CONTABO_CUSTOMER_ID',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

export function resolveEnvFileCandidates(): string[] {
  const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
  if (nodeEnv === 'staging') return ['.env.staging', 'env.staging'];
  if (nodeEnv === 'production') return ['.env.production', 'env.production'];
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

function applyParsedIfEmpty(parsed?: Record<string, string>, allowedKeys?: string[]) {
  if (!parsed) return;
  for (const [key, value] of Object.entries(parsed)) {
    if (allowedKeys && !allowedKeys.includes(key)) continue;
    if (!envValue(key) && String(value || '').trim()) {
      process.env[key] = value;
    }
  }
}

function loadFileIfPresent(envPath: string, allowedKeys?: string[]): boolean {
  if (!fs.existsSync(envPath)) return false;
  const result = dotenv.config({ path: envPath });
  applyParsedIfEmpty(result.parsed, allowedKeys);
  return true;
}

function applySecretAliases() {
  const copies: Array<[string, string]> = [
    ['STAGING_JWT_SECRET', 'JWT_SECRET'],
    ['STAGING_SUPABASE_JWT_SECRET', 'SUPABASE_JWT_SECRET'],
    ['STAGING_LICENSE_HMAC_SECRET', 'LICENSE_HMAC_SECRET'],
    ['STAGING_QUASAR_WEBHOOK_SIGNING_SECRET', 'QUASAR_WEBHOOK_SIGNING_SECRET'],
    ['STAGING_SUPABASE_URL', 'SUPABASE_URL'],
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
 * Staging/production do not merge mixed developer `.env` / `env` files (those still carry
 * legacy SUPABASE_SERVICE_ROLE_KEY names that SecurityBoot rejects).
 */
export function loadEnv(): string {
  if (loadedFile) return loadedFile;

  const cwd = process.cwd();
  for (const envPath of resolveSystemEnvFileCandidates()) {
    loadFileIfPresent(envPath);
  }

  const candidates = resolveEnvFileCandidates();
  for (const envFile of candidates) {
    const envPath = path.resolve(cwd, envFile);
    if (!loadFileIfPresent(envPath)) continue;
    if ((process.env.NODE_ENV || '').trim().toLowerCase() === 'staging') {
      loadFileIfPresent(path.resolve(cwd, '.env'), CONTABO_KEYS);
    }
    applySecretAliases();
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

  const fallback = dotenv.config();
  applyParsedIfEmpty(fallback.parsed);
  applySecretAliases();
  loadedFile = '.env';
  return loadedFile;
}
