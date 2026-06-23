import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('Testing connectivity to Supabase postgrest...');
  const start = Date.now();
  try {
    const { data, error } = await supabaseAdmin.from('tenants').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Error querying tenants:', error.message);
    } else {
      console.log(`Successfully connected! Staging tenants count resolved in ${Date.now() - start}ms.`);
    }
  } catch (err: any) {
    console.error('Fatal error:', err.message || err);
  }
  process.exit(0);
}
run();
