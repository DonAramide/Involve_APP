/**
 * Staging Supabase env helpers — loads gitignored .env.staging only.
 * Never logs secret values.
 */
import fs from 'fs';
import path from 'path';

const BACKEND_ROOT = path.join(__dirname, '../..');

export function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    const hash = v.indexOf(' #');
    if (hash >= 0) v = v.slice(0, hash).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

/** Staging plane only — do not merge mixed developer .env for Supabase secrets. */
export function loadStagingEnv(): Record<string, string> {
  return parseEnvFile(path.join(BACKEND_ROOT, '.env.staging'));
}

export function classifySupabaseKey(value: string | undefined): string {
  if (!value) return 'UNSET';
  if (value.startsWith('sb_publishable_')) return 'PUBLISHABLE';
  if (value.startsWith('sb_secret_')) return 'SECRET';
  if (value.startsWith('eyJ')) return 'LEGACY_JWT';
  return 'OTHER';
}

export function requireStagingSupabaseUrl(env: Record<string, string>): string {
  const url = env.STAGING_SUPABASE_URL || '';
  if (!url) throw new Error('STAGING_SUPABASE_URL is required in .env.staging');
  return url;
}

export function requireStagingPublishableKey(env: Record<string, string>): string {
  const key = env.STAGING_SUPABASE_PUBLISHABLE_KEY || '';
  if (!key) {
    throw new Error('STAGING_SUPABASE_PUBLISHABLE_KEY is required in .env.staging');
  }
  if (!key.startsWith('sb_publishable_')) {
    throw new Error('STAGING_SUPABASE_PUBLISHABLE_KEY must be a publishable key (sb_publishable_*)');
  }
  return key;
}

export function requireStagingSecretKey(env: Record<string, string>): string {
  const key = env.STAGING_SUPABASE_SECRET_KEY || '';
  if (!key) {
    throw new Error('STAGING_SUPABASE_SECRET_KEY is required in .env.staging');
  }
  if (!key.startsWith('sb_secret_')) {
    throw new Error('STAGING_SUPABASE_SECRET_KEY must be a secret key (sb_secret_*)');
  }
  return key;
}
