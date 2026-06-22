import { supabaseAdmin } from '../src/db/supabase';

async function check() {
  console.log('=== CHECKING SCHEMA OF FINANCIAL TABLES ===');
  
  const tables = ['ledger_entries', 'wallet_ledger', 'ledgers', 'wallets'];
  
  // Use public process.env configs
  const url = process.env.STAGING_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';

  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const spec = await response.json();
  const definitions = spec.definitions || {};

  for (const table of tables) {
    console.log(`\nTable: ${table}`);
    if (definitions[table]) {
      console.log('Columns:');
      for (const [colName, colDef] of Object.entries(definitions[table].properties || {})) {
        console.log(`  - ${colName}: ${JSON.stringify(colDef)}`);
      }
    } else {
      console.log('  ❌ Table not found in OpenAPI schema');
    }
  }

  // Row counts
  console.log('\n=== ROW COUNTS ===');
  for (const table of tables) {
    try {
      const { count, error } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`  ${table}: query error (${error.message})`);
      } else {
        console.log(`  ${table}: ${count} rows`);
      }
    } catch (e: any) {
      console.log(`  ${table}: exception (${e.message})`);
    }
  }
}

check().catch(console.error);
