const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.STAGING_SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const key = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.STAGING_SUPABASE_KEY;

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

async function run() {
  console.log("Checking tenants table schema on staging...");
  const { data: row, error: rowErr } = await supabase.from('tenants').select('*').limit(1);
  if (rowErr) {
    console.error("Error fetching a row from tenants:", rowErr.message);
  } else {
    console.log("A tenants row keys:", row.length > 0 ? Object.keys(row[0]) : "No rows found");
    if (row.length > 0) {
      console.log("Sample tenant_code:", row[0].tenant_code);
    }
  }

  // Check the OpenAPI specification for tenants definition to verify constraints and columns
  const axios = require('axios');
  try {
    const res = await axios.get(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const tenantsDef = res.data.definitions.tenants;
    console.log("\nTenants table definition in OpenAPI:");
    console.log(JSON.stringify(tenantsDef, null, 2));
  } catch (err) {
    console.error("Error fetching OpenAPI schema:", err.message);
  }
}

run();
