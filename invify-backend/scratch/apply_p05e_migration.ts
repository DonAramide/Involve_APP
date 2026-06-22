import { supabaseAdmin } from '../src/db/supabase';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  console.log('Loading migration SQL...');
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260619_p05e_migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('Applying P0-5E migration on staging via run_sql RPC...');
  const { data, error } = await supabaseAdmin.rpc('run_sql', { sql });

  if (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Migration applied successfully! Return:', data);
  }
}

run().catch(console.error);
