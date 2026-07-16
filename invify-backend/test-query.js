require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SUPABASE_SERVICE_KEY);

async function test() {
  const name = "aramyde777";
  const { data: userMatches, error: e1 } = await supabase
    .from('users')
    .select('tenant_id, email')
    .ilike('email', `%${name}%`);
  
  console.log("userMatches:", userMatches, e1);

  if (userMatches && userMatches.length > 0) {
    const matchingTenantIds = userMatches.map(u => u.tenant_id).filter(Boolean);
    console.log("matchingTenantIds:", matchingTenantIds);
    let query = supabase.from('tenants').select('id, name');
    query = query.or(`name.ilike.%${name}%,agent_code.ilike.%${name}%,id.in.(${matchingTenantIds.join(',')})`);
    const { data: tenants, error: e2 } = await query;
    console.log("tenants:", tenants, e2);
  }
}
test();
