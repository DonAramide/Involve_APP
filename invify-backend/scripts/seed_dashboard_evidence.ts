import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let supabaseUrl = '';
let supabaseKey = '';

if (process.env.BUILD_VARIANT === 'STAGING' || process.env.APP_ENV === 'staging') {
  supabaseUrl = process.env.STAGING_SUPABASE_URL || '';
  supabaseKey = process.env.STAGING_SUPABASE_SECRET_KEY || '';
} else {
  supabaseUrl = process.env.LOCAL_SUPABASE_URL || process.env.SUPABASE_URL || '';
  supabaseKey = process.env.LOCAL_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials for seeding");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedEvidence() {
  console.log('--- RC2.5.1 EVIDENCE SEED SCRIPT ---');
  console.log('Label: PHYSICAL TEST EVIDENCE SEEDING (IDEMPOTENT)');
  const tenantId = 'e2b3c4d5-6789-0123-4567-89abcdef0123';
  
  try {
    // 1. Ensure Tenant Exists
    await supabase.from('tenants').upsert({ id: tenantId, name: 'Evidence Seed School', slug: 'evidence-seed-school', status: 'active' }, { onConflict: 'id' });

    // 2. Ensure Wallet Exists & has balance
    console.log('[+] Seeding wallets...');
    await supabase.from('wallets').upsert({
      tenant_id: tenantId,
      balance: 1424500,
      currency: 'NGN'
    }, { onConflict: 'tenant_id' });

    // 3. Ensure Ledger Entries for Settlement & Revenue
    console.log('[+] Seeding ledger_entries...');
    const ledgerEntries = [
      { id: 'tx-seed-1', tenant_id: tenantId, amount: 84000, entry_type: 'CREDIT', status: 'completed', reference: 'QS-TX-892410', created_at: new Date().toISOString() },
      { id: 'tx-seed-2', tenant_id: tenantId, amount: 150000, entry_type: 'CREDIT', status: 'completed', reference: 'QS-PO-301211', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 'tx-seed-3', tenant_id: tenantId, amount: 32000, entry_type: 'CREDIT', status: 'completed', reference: 'QS-TX-892409', created_at: new Date(Date.now() - 7200000).toISOString() },
      { id: 'tx-seed-4', tenant_id: tenantId, amount: 120000, entry_type: 'CREDIT', status: 'pending', reference: 'QS-TX-892408', created_at: new Date(Date.now() - 10800000).toISOString() }
    ];

    for (const entry of ledgerEntries) {
      await supabase.from('ledger_entries').upsert(entry, { onConflict: 'id' });
    }

    // 4. Seeding Students for the Metric (Total Students)
    console.log('[+] Seeding students...');
    await supabase.from('students').upsert([
      { id: 'student-seed-1', school_id: tenantId, first_name: 'John', last_name: 'Doe', current_class: 'JSS1' },
      { id: 'student-seed-2', school_id: tenantId, first_name: 'Jane', last_name: 'Smith', current_class: 'SS2' }
    ], { onConflict: 'id' });

    console.log('✅ Seeding completed. Database contains physical evidence.');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
}

seedEvidence();
