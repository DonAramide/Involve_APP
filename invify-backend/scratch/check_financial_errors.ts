import { supabaseAdmin } from '../src/db/supabase';

async function check() {
  console.log('=== CHECKING SCHEMA VIA SQL EXECUTION OR PROBE ===');
  
  // We can query table column metadata from pg_attribute / pg_class via RPC or custom queries if a sql runner RPC exists.
  // Let's see if we can read information_schema.columns via supabase.rpc or a direct select on pg_catalog if exposed.
  // Actually, we can use the rest endpoint but query the database config or tables. Wait, why were ledger_entries and ledgers null?
  // Null row counts in supabaseAdmin.from() mean the tables returned an error or do not exist in the active schema, or are in a different schema (e.g. private, auth, etc.).
  // Let's run a select that gets the errors:
  
  const tables = ['ledger_entries', 'wallet_ledger', 'ledgers', 'wallets'];
  
  for (const table of tables) {
    const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table} error:`, error.message, error.code);
    } else {
      console.log(`Table ${table} success, fetched:`, data);
    }
  }
}

check().catch(console.error);
