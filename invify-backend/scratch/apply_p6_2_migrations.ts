import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.STAGING_SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.STAGING_SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing STAGING_SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runSQL(filePath: string) {
    console.log(`Running migration: ${path.basename(filePath)}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // We can use RPC if available or a custom REST call if raw SQL is not enabled.
    // Let's try exec_sql RPC which might be present in this project's setup.
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        // Fallback for Staging if exec_sql doesn't work (which often it doesn't without postgres wrapper)
        // We might need to ask the user to use supabase db push, OR we just simulate it by executing directly.
        console.error(`Failed to run via exec_sql:`, error.message);
        
        // Since we are using an HTTP client, Supabase JS cannot run raw DDL directly unless through RPC.
        // I will assume exec_sql is available or I'll just report the error.
        console.log("If exec_sql is not available, please run `supabase db push`.");
    } else {
        console.log(`Successfully applied ${path.basename(filePath)}`);
    }
}

async function apply() {
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    
    await runSQL(path.join(migrationsDir, '20260708_p06_reconciliation_cases.sql'));
    await runSQL(path.join(migrationsDir, '20260708_p06b_reconciliation_cases_rls_version.sql'));
}

apply().catch(console.error);
