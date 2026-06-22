process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../src/db/supabase';
import * as fs from 'fs';

async function run() {
  const fileArg = process.argv[2] || 'scratch/phase_1c_staging_migration.sql';
  const sqlPath = path.isAbsolute(fileArg) ? fileArg : path.join(__dirname, '..', fileArg);
  
  console.log(`Reading SQL file from: ${sqlPath}`);
  if (!fs.existsSync(sqlPath)) {
    console.error(`File does not exist: ${sqlPath}`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log('Applying SQL DDL statements via exec_sql RPC...');
  
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('❌ SQL Execution failed:', error.message);
    process.exit(1);
  } else {
    console.log('✅ SQL Execution successful!');
  }
}

run().catch(console.error);
