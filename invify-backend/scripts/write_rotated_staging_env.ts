/**
 * Writes gitignored .env.staging with rotated app-owned staging secrets.
 * Preserves STAGING Supabase publishable/secret keys when present.
 * Never prints secret values.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { classifySupabaseKey, parseEnvFile } from './lib/staging-supabase-env';

const INSECURE = new Set([
  'your-super-secret-key-2026',
  'invify-fintech-fallback-secret-2026',
  'super-secret-jwt-key-for-local-testing',
  'local-dev-jwt-secret-change-me!!',
  'local-dev-supabase-jwt-secret!',
  'local-dev-license-hmac-secret!!',
]);

function gen(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function classify(v: string | undefined): string {
  if (!v) return 'UNSET';
  if (INSECURE.has(v)) return 'INSECURE_DEFAULT';
  return classifySupabaseKey(v) !== 'UNSET' ? classifySupabaseKey(v) : 'SET';
}

function main() {
  const dir = path.join(__dirname, '..');
  const hostEnvPath = path.join(dir, '.env');
  const stagingPath = path.join(dir, '.env.staging');
  const host = parseEnvFile(hostEnvPath);
  const existingStaging = parseEnvFile(stagingPath);

  const url = existingStaging.STAGING_SUPABASE_URL || host.STAGING_SUPABASE_URL;
  const publishable =
    existingStaging.STAGING_SUPABASE_PUBLISHABLE_KEY ||
    host.STAGING_SUPABASE_PUBLISHABLE_KEY ||
    '';
  const secret =
    existingStaging.STAGING_SUPABASE_SECRET_KEY ||
    host.STAGING_SUPABASE_SECRET_KEY ||
    '';

  if (!url || !publishable || !secret) {
    throw new Error(
      'missing STAGING_SUPABASE_URL / STAGING_SUPABASE_PUBLISHABLE_KEY / STAGING_SUPABASE_SECRET_KEY',
    );
  }

  const jwtWasInsecure = INSECURE.has(host.JWT_SECRET || '');
  const newJwt = gen();
  const newSupabaseJwt = gen();
  const newHmac = gen();
  const newWebhook = gen();

  const lines = [
    'NODE_ENV=staging',
    'APP_ENV=staging',
    'BUILD_VARIANT=STAGING',
    'PORT=3000',
    'FEATURE_REAL_MONEY_PAYOUTS=false',
    'ENABLE_SIMULATOR=false',
    'OFFLINE_LOCAL_AUTH=false',
    'OFFLINE_MOCK_AUTH=false',
    'ENABLE_INPROCESS_FINANCIAL_WORKERS=false',
    'STAGING_IMAGE=invify:58b5e459-p4-fin2',
    'STAGING_API_PORT=3000',
    'STAGING_APP_URL=http://staging.invify.local:4173',
    'CORS_ORIGINS=http://staging.invify.local:4173,http://staging.invify.local:4174',
    'STAGING_QUASAR_BASE_URL=',
    `STAGING_SUPABASE_URL=${url}`,
    `STAGING_SUPABASE_PUBLISHABLE_KEY=${publishable}`,
    `STAGING_SUPABASE_SECRET_KEY=${secret}`,
    `STAGING_JWT_SECRET=${newJwt}`,
    `STAGING_SUPABASE_JWT_SECRET=${newSupabaseJwt}`,
    `STAGING_LICENSE_HMAC_SECRET=${newHmac}`,
    `STAGING_QUASAR_WEBHOOK_SIGNING_SECRET=${newWebhook}`,
    `JWT_SECRET=${newJwt}`,
    `SUPABASE_JWT_SECRET=${newSupabaseJwt}`,
    `LICENSE_HMAC_SECRET=${newHmac}`,
  ];
  fs.writeFileSync(stagingPath, lines.join('\n') + '\n', { encoding: 'utf8', mode: 0o600 });

  if (jwtWasInsecure && fs.existsSync(hostEnvPath)) {
    const raw = fs.readFileSync(hostEnvPath, 'utf8');
    const replaced = raw.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${newJwt}`);
    if (replaced !== raw) {
      fs.writeFileSync(hostEnvPath, replaced, 'utf8');
    }
  }

  console.log('STAGING_ENV_WRITTEN=true');
  console.log('JWT_SECRET_WAS_INSECURE_DEFAULT=' + jwtWasInsecure);
  console.log('ROTATED=STAGING_JWT_SECRET,STAGING_SUPABASE_JWT_SECRET,STAGING_LICENSE_HMAC_SECRET,STAGING_QUASAR_WEBHOOK_SIGNING_SECRET');
  console.log('SUPABASE_KEYS=publishable_and_secret_preserved');
  console.log('PUBLISHABLE_CLASS=' + classify(publishable));
  console.log('SECRET_CLASS=' + classify(secret));
}

main();
