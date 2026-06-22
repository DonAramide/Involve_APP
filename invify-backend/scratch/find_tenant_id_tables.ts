import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const url = process.env.STAGING_SUPABASE_URL || '';
const key = process.env.STAGING_SUPABASE_SERVICE_KEY || '';

// Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function run() {
  console.log('=== DISCOVERING TENANT_ID TABLES ===\n');

  // Fetch OpenAPI spec
  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const spec = await response.json();
  const definitions = spec.definitions || {};

  const tenantTables: string[] = [];
  const usersTenantIdDef = definitions.users?.properties?.tenant_id;
  
  console.log('--- Tables with tenant_id Column ---');
  for (const [tableName, tableDef] of Object.entries(definitions) as any) {
    const props = tableDef.properties || {};
    if (props.tenant_id) {
      const typeStr = props.tenant_id.type || 'unknown';
      const formatStr = props.tenant_id.format || 'none';
      console.log(`- ${tableName} (type: ${typeStr}, format: ${formatStr})`);
      tenantTables.push(tableName);
    }
  }

  console.log('\nusers.tenant_id definition:', JSON.stringify(usersTenantIdDef));

  // Initialize supabase client to inspect row values
  const supabaseAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('\n--- Verifying Stored tenant_id Values (Checking if they are valid UUIDs) ---');
  
  // Inspect users.tenant_id
  try {
    const { data: users, error } = await supabaseAdmin.from('users').select('id, email, tenant_id').limit(100);
    if (error) throw error;
    
    let allValid = true;
    let nullCount = 0;
    let invalidCount = 0;
    
    for (const u of users || []) {
      if (u.tenant_id === null || u.tenant_id === undefined) {
        nullCount++;
      } else if (!uuidRegex.test(u.tenant_id)) {
        console.log(`  ❌ Invalid UUID in users.tenant_id: "${u.tenant_id}" for user ${u.email} (${u.id})`);
        allValid = false;
        invalidCount++;
      }
    }
    console.log(`users.tenant_id: Total scanned=${users?.length || 0}, Null=${nullCount}, Invalid UUID=${invalidCount}`);
  } catch (err: any) {
    console.log(`Failed to scan users: ${err.message}`);
  }

  // Inspect each tenantTable's tenant_id column values
  for (const table of tenantTables) {
    try {
      const { data: rows, error } = await supabaseAdmin.from(table).select('tenant_id').limit(100);
      if (error) throw error;
      
      let allValid = true;
      let nullCount = 0;
      let invalidCount = 0;
      const invalidValues = new Set<string>();
      
      for (const r of rows || []) {
        const val = r.tenant_id;
        if (val === null || val === undefined) {
          nullCount++;
        } else if (!uuidRegex.test(val)) {
          allValid = false;
          invalidCount++;
          invalidValues.add(String(val));
        }
      }
      
      const statusIcon = allValid ? '✅' : '❌';
      console.log(`${statusIcon} ${table}.tenant_id: Total scanned=${rows?.length || 0}, Null=${nullCount}, Invalid UUID=${invalidCount}`, 
                  invalidCount > 0 ? `(Sample invalid: ${Array.from(invalidValues).slice(0, 5).join(', ')})` : '');
    } catch (err: any) {
      console.log(`⚠️ ${table}.tenant_id: Failed to scan (${err.message})`);
    }
  }
}

run().catch(console.error);
