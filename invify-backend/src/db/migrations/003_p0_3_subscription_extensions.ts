/**
 * P0-3 Migration: Subscription Extensions Schema Validation
 * 
 * Validates existence of:
 * - subscription_events table
 * - columns: id, subscription_id, tenant_id, event_type, days_added, performed_by, created_at
 * 
 * Run: npx ts-node src/db/migrations/003_p0_3_subscription_extensions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolveMigrationSupabaseCredentials } from './migration-env';

dotenv.config();

const { url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY } = resolveMigrationSupabaseCredentials();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('[Migration] P0-3 Subscription Extensions Schema — Starting...');
  console.log(`[Migration] Target: ${SUPABASE_URL}`);

  const requiredColumns = [
    'id', 'subscription_id', 'tenant_id', 'event_type', 'days_added', 'performed_by', 'created_at'
  ];

  console.log('\n[Migration] Checking subscription_events table...');
  try {
    const { error } = await supabase.from('subscription_events').select(requiredColumns.join(',')).limit(0);
    
    if (error) {
      console.log('❌ subscription_events table or some columns are MISSING. Details:', error.message);
      printSQLInstructions();
    } else {
      console.log('✅ subscription_events table and all required columns exist.');
    }
  } catch (err: any) {
    console.log('❌ Failed to connect or query table. Details:', err.message);
    printSQLInstructions();
  }
}

function printSQLInstructions() {
  console.log('\n' + '='.repeat(70));
  console.log('[Migration] SQL REQUIRED — Run the following in Supabase SQL Editor:');
  console.log('='.repeat(70) + '\n');
  console.log(`
-- Create subscription_events table conforming to P0-3 requirements
CREATE TABLE IF NOT EXISTS public.subscription_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type      VARCHAR(20) NOT NULL, -- 'CREATED', 'EXTENDED', 'UPGRADED', 'DOWNGRADED', 'SUSPENDED', 'EXPIRED'
    days_added      INTEGER DEFAULT 0,
    performed_by    TEXT NOT NULL, -- Email of the operator/admin
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add policy
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.subscription_events FOR ALL TO service_role USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_sub ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant ON public.subscription_events(tenant_id);
  `);
  console.log('='.repeat(70));
}

runMigration().then(() => {
  console.log('\n[Migration] Done.');
  process.exit(0);
}).catch(err => {
  console.error('[Migration] Fatal error:', err);
  process.exit(1);
});
