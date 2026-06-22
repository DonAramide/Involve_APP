import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../src/db/supabase';

async function check() {
  console.log('=== CHECKING ACTUAL COLUMNS OF TENANTS TABLE ===');
  
  const url = process.env.STAGING_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';

  if (!url) {
    console.error('SUPABASE_URL env is empty!');
    return;
  }

  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const spec = await response.json();
  const definitions = spec.definitions || {};

  const table = 'tenants';
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

check().catch(console.error);
