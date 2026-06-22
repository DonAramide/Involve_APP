import { supabaseAdmin } from '../src/db/supabase';
import * as fs from 'fs';

async function run() {
  console.log('Reading migration SQL...');
  const sql = fs.readFileSync('scratch/staging_ledger_migration.sql', 'utf-8');
  console.log('Applying migration via exec_sql...');
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('Migration failed:', error.message);
  } else {
    console.log('Migration successful! Data:', data);
  }
}

run().catch(console.error);
