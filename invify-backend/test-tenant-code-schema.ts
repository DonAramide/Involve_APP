import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.STAGING_SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const key = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.STAGING_SUPABASE_KEY;

const supabase = createClient(url, key!, {
  auth: { persistSession: false }
});

async function run() {
  console.log("Checking tenants table schema on staging...");
  
  // Query table structure using Postgres system catalogs if possible via RPC or generic REST.
  // Actually, we can fetch a single row from tenants to see its keys.
  const { data: row, error: rowErr } = await supabase.from('tenants').select('*').limit(1);
  if (rowErr) {
    console.error("Error fetching a row from tenants:", rowErr.message);
  } else {
    console.log("A tenants row keys:", row.length > 0 ? Object.keys(row[0]) : "No rows found");
    if (row.length > 0) {
      console.log("Sample tenant_code:", row[0].tenant_code);
    }
  }

  // To check details about unique constraints/indexes, we can query information_schema or pg_indexes.
  // We can do this using a query or checking if we can select from information_schema via PostgREST.
  // PostgREST exposes system tables if they are in the API schema, but usually it doesn't.
  // Let's try selecting from pg_indexes or information_schema.
  const { data: indexes, error: idxErr } = await supabase.from('pg_indexes' as any).select('*').eq('tablename' as any, 'tenants');
  if (idxErr) {
    console.warn("Could not query pg_indexes directly (expected under default API permissions):", idxErr.message);
  } else {
    console.log("Indexes on tenants:", indexes);
  }
}

run();
