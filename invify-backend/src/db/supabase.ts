// src/db/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '../config/load-env';
import { BuildVariantService } from '../config/build-variant';
import { privilegedAdminCreateClientArgs } from './postgrest-service-key';

loadEnv();

const { url: supabaseUrl, key: supabaseKey, serviceRoleKey } = BuildVariantService.getInstance().getSupabaseConfig();

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing credentials for active build variant');
} else {
  console.log(`[Supabase] Active environment target URL: ${supabaseUrl}`);
}

// LOCAL/test may boot without real keys; never use empty strings (supabase-js throws).
// Staging/prod already throw in BuildVariantService before reaching here.
const clientUrl = supabaseUrl || 'http://127.0.0.1:54321';
const clientKey = supabaseKey || 'local-test-missing-key';
const clientServiceKey = serviceRoleKey || clientKey;
const jwtSecret =
  process.env.STAGING_SUPABASE_JWT_SECRET ||
  process.env.PROD_SUPABASE_JWT_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  '';
const { apiKey: adminApiKey, options: adminKeyOptions } = privilegedAdminCreateClientArgs(
  clientServiceKey,
  jwtSecret,
);
if (clientServiceKey.startsWith('sb_secret_') && !adminKeyOptions.global?.headers?.Authorization) {
  console.warn('[Supabase] sb_secret key has no JWT secret; PostgREST writes may be blocked by RLS');
}

export const supabase = createClient(clientUrl, clientKey);

const adminOpts = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
};

/** Auth Admin API (createUser, generateLink). Uses sb_secret / service key, never a minted JWT. */
export const supabaseAuthAdmin = createClient(clientUrl, clientServiceKey, adminOpts);

/**
 * Database REST. `apikey` is the server secret (sb_secret or legacy JWT service key).
 * Minted HS256 JWTs are Authorization-only; they must not be used as apikey.
 */
export const supabaseAdmin = createClient(clientUrl, adminApiKey, {
  ...adminOpts,
  ...adminKeyOptions,
});
