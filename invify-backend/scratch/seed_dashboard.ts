import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.STAGING_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.STAGING_SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seed() {
  console.log("Seeding small logical data for dashboard...");

  // 1. Tenants
  for (let i = 1; i <= 5; i++) {
    await supabase.from('tenants').insert({
      name: `Demo Tenant ${i}`,
      email: `tenant${i}@example.com`,
      status: 'active'
    });
  }

  // 2. Transactions
  const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
  if (tenants && tenants.length > 0) {
    const tId = tenants[0].id;
    for (let i = 1; i <= 10; i++) {
      await supabase.from('ledger_entries').insert({
        tenant_id: tId,
        amount: Math.round(Math.random() * 5000),
        entry_type: 'CARD_PAYMENT',
        status: i % 10 === 0 ? 'failed' : 'completed',
        reference: `REF_SEED_${Date.now()}_${i}`,
        idempotency_key: `IDEM_SEED_${Date.now()}_${i}`
      });
    }

    // 3. Open Incidents
    for (let i = 1; i <= 2; i++) {
      await supabase.from('reconciliation_cases').insert({
        tenant_id: tId,
        case_type: 'MISSING_SETTLEMENT',
        priority: 'HIGH',
        status: 'OPEN',
        amount_discrepancy: 15000
      });
    }
  }
  
  console.log("Seeding complete!");
}

seed();
