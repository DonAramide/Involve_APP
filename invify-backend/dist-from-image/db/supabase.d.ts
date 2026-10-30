export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
/** Auth Admin API (createUser, generateLink). Uses sb_secret / service key, never a minted JWT. */
export declare const supabaseAuthAdmin: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
/**
 * Database REST. `apikey` is the server secret (sb_secret or legacy JWT service key).
 * Minted HS256 JWTs are Authorization-only; they must not be used as apikey.
 */
export declare const supabaseAdmin: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
