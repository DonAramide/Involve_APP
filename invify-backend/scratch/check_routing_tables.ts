import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  const { data: healths } = await supabaseAdmin.from('provider_health_registry').select('*');
  const { data: costs } = await supabaseAdmin.from('provider_clearing_profiles').select('*');
  const { data: balances } = await supabaseAdmin.from('provider_balance_snapshots').select('*');
  const { data: dailyLimits } = await supabaseAdmin.from('provider_daily_limits').select('*');

  console.log('HEALTHS:', healths);
  console.log('COSTS:', costs);
  console.log('BALANCES:', balances);
  console.log('LIMITS:', dailyLimits);
}
run().catch(console.error);
