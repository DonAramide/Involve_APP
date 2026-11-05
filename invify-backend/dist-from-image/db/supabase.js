"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.supabaseAuthAdmin = exports.supabase = void 0;
// src/db/supabase.ts
const supabase_js_1 = require("@supabase/supabase-js");
const load_env_1 = require("../config/load-env");
const build_variant_1 = require("../config/build-variant");
const postgrest_service_key_1 = require("./postgrest-service-key");
(0, load_env_1.loadEnv)();
const { url: supabaseUrl, key: supabaseKey, serviceRoleKey } = build_variant_1.BuildVariantService.getInstance().getSupabaseConfig();
if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase] Missing credentials for active build variant');
}
else {
    console.log(`[Supabase] Active environment target URL: ${supabaseUrl}`);
}
// LOCAL/test may boot without real keys; never use empty strings (supabase-js throws).
// Staging/prod already throw in BuildVariantService before reaching here.
const clientUrl = supabaseUrl || 'http://127.0.0.1:54321';
const clientKey = supabaseKey || 'local-test-missing-key';
const clientServiceKey = serviceRoleKey || clientKey;
const jwtSecret = process.env.STAGING_SUPABASE_JWT_SECRET ||
    process.env.PROD_SUPABASE_JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    '';
const { apiKey: adminApiKey, options: adminKeyOptions } = (0, postgrest_service_key_1.privilegedAdminCreateClientArgs)(clientServiceKey, jwtSecret);
if (clientServiceKey.startsWith('sb_secret_') && !adminKeyOptions.global?.headers?.Authorization) {
    console.warn('[Supabase] sb_secret key has no JWT secret; PostgREST writes may be blocked by RLS');
}
exports.supabase = (0, supabase_js_1.createClient)(clientUrl, clientKey);
const adminOpts = {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
};
/** Auth Admin API (createUser, generateLink). Uses sb_secret / service key, never a minted JWT. */
exports.supabaseAuthAdmin = (0, supabase_js_1.createClient)(clientUrl, clientServiceKey, adminOpts);
/**
 * Database REST. `apikey` is the server secret (sb_secret or legacy JWT service key).
 * Minted HS256 JWTs are Authorization-only; they must not be used as apikey.
 */
exports.supabaseAdmin = (0, supabase_js_1.createClient)(clientUrl, adminApiKey, {
    ...adminOpts,
    ...adminKeyOptions,
});
//# sourceMappingURL=supabase.js.map