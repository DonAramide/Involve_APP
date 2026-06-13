// src/db/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

import { BuildVariantService } from '../config/build-variant';

const { url: supabaseUrl, key: supabaseKey, serviceRoleKey } = BuildVariantService.getInstance().getSupabaseConfig();

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing credentials for active build variant');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey || supabaseKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
