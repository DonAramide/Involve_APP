import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  const { data } = await supabaseAdmin.from('provider_capabilities').select('*');
  console.log('CAPABILITIES:', JSON.stringify(data, null, 2));
}
run().catch(console.error);
