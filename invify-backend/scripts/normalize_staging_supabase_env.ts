/**
 * Normalize gitignored staging env files to publishable/secret key names.
 * Never prints secret values. Does not read mixed developer .env for Supabase keys.
 */
import fs from 'fs';
import path from 'path';
import {
  classifySupabaseKey,
  parseEnvFile,
} from './lib/staging-supabase-env';

const BACKEND_ROOT = path.join(__dirname, '..');
const STAGING_PATH = path.join(BACKEND_ROOT, '.env.staging');
const ADMIN_STAGING_PATH = path.join(BACKEND_ROOT, '..', 'invify-admin', '.env.staging');

function findValueByPrefix(env: Record<string, string>, prefix: string): string {
  if (env.STAGING_SUPABASE_PUBLISHABLE_KEY?.startsWith(prefix)) return env.STAGING_SUPABASE_PUBLISHABLE_KEY;
  if (env.STAGING_SUPABASE_SECRET_KEY?.startsWith(prefix)) return env.STAGING_SUPABASE_SECRET_KEY;
  for (const v of Object.values(env)) {
    if (v.startsWith(prefix)) return v;
  }
  return '';
}

function rewriteStagingFile(existing: Record<string, string>, publishable: string, secret: string, url: string) {
  const drop = new Set([
    'STAGING_SUPABASE_KEY',
    'STAGING_SUPABASE_SERVICE_KEY',
    'SUPABASE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_URL',
  ]);
  const keepOrder = [
    'NODE_ENV',
    'APP_ENV',
    'BUILD_VARIANT',
    'PORT',
    'FEATURE_REAL_MONEY_PAYOUTS',
    'ENABLE_SIMULATOR',
    'OFFLINE_LOCAL_AUTH',
    'OFFLINE_MOCK_AUTH',
    'ENABLE_INPROCESS_FINANCIAL_WORKERS',
    'STAGING_IMAGE',
    'STAGING_API_PORT',
    'STAGING_APP_URL',
    'CORS_ORIGINS',
    'STAGING_QUASAR_BASE_URL',
    'STAGING_SUPABASE_URL',
    'STAGING_SUPABASE_PUBLISHABLE_KEY',
    'STAGING_SUPABASE_SECRET_KEY',
    'STAGING_JWT_SECRET',
    'STAGING_SUPABASE_JWT_SECRET',
    'STAGING_LICENSE_HMAC_SECRET',
    'STAGING_QUASAR_WEBHOOK_SIGNING_SECRET',
    'JWT_SECRET',
    'SUPABASE_JWT_SECRET',
    'LICENSE_HMAC_SECRET',
  ];
  const out: Record<string, string> = { ...existing };
  out.STAGING_SUPABASE_URL = url;
  out.STAGING_SUPABASE_PUBLISHABLE_KEY = publishable;
  out.STAGING_SUPABASE_SECRET_KEY = secret;
  for (const k of drop) delete out[k];

  const lines: string[] = [];
  for (const k of keepOrder) {
    if (out[k] != null && out[k] !== '') lines.push(`${k}=${out[k]}`);
  }
  for (const [k, v] of Object.entries(out)) {
    if (!keepOrder.includes(k) && !drop.has(k) && v !== '') lines.push(`${k}=${v}`);
  }
  fs.writeFileSync(STAGING_PATH, lines.join('\n') + '\n', { encoding: 'utf8', mode: 0o600 });
}

function writeAdminStaging(url: string, publishable: string) {
  const lines = [
    'VITE_BUILD_VARIANT=STAGING',
    'VITE_APP_ENV=staging',
    'VITE_API_URL=https://staging.invify.org',
    `VITE_SUPABASE_URL=${url}`,
    `VITE_SUPABASE_PUBLISHABLE_KEY=${publishable}`,
    '',
  ];
  fs.writeFileSync(ADMIN_STAGING_PATH, lines.join('\n'), { encoding: 'utf8', mode: 0o600 });
}

function main() {
  const staging = parseEnvFile(STAGING_PATH);
  const admin = parseEnvFile(path.join(BACKEND_ROOT, '..', 'invify-admin', '.env'));
  const merged = { ...admin, ...staging, ...parseEnvFile(ADMIN_STAGING_PATH) };

  const publishable =
    merged.STAGING_SUPABASE_PUBLISHABLE_KEY ||
    merged.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.STAGING_SUPABASE_PUBLISHABLE_KEY ||
    findValueByPrefix(merged, 'sb_publishable_');
  const secret =
    merged.STAGING_SUPABASE_SECRET_KEY ||
    process.env.STAGING_SUPABASE_SECRET_KEY ||
    findValueByPrefix(merged, 'sb_secret_');
  const url = merged.STAGING_SUPABASE_URL || merged.VITE_SUPABASE_URL || merged.SUPABASE_URL || '';

  console.log('PUBLISHABLE_CLASS=' + classifySupabaseKey(publishable));
  console.log('SECRET_CLASS=' + classifySupabaseKey(secret));
  console.log('URL_SET=' + !!url);

  if (!publishable.startsWith('sb_publishable_') || !secret.startsWith('sb_secret_') || !url) {
    console.log('NORMALIZE=FAIL missing_or_invalid_publishable_secret_or_url');
    process.exit(1);
  }

  rewriteStagingFile(staging, publishable, secret, url);
  writeAdminStaging(url, publishable);
  console.log('NORMALIZE=PASS backend=.env.staging admin=.env.staging');
}

main();
