// src/db/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

import { BuildVariantService } from '../config/build-variant';

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

export const supabase = createClient(clientUrl, clientKey);

export const supabaseAdmin = createClient(clientUrl, clientServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
