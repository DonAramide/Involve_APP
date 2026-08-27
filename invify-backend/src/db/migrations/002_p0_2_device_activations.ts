/**
 * P0-2 Migration: Device Activations Schema Validation
 * 
 * Validates existence of:
 * - device_activations table
 * - columns: id, activation_code, tenant_id, duration_days, plan_index, device_suffix, device_id, status, is_used, created_by, created_at, used_at, expires_at
 * 
 * Run: npx ts-node src/db/migrations/002_p0_2_device_activations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolveMigrationSupabaseCredentials } from './migration-env';

dotenv.config();

const { url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY } = resolveMigrationSupabaseCredentials();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('[Migration] P0-2 Device Activations Schema — Starting...');
  console.log(`[Migration] Target: ${SUPABASE_URL}`);

  const requiredColumns = [
    'id', 'activation_code', 'tenant_id', 'duration_days', 'plan_index',
    'device_suffix', 'device_id', 'status', 'is_used', 'created_by',
    'created_at', 'used_at', 'expires_at'
  ];

  console.log('\n[Migration] Checking device_activations table...');
  try {
    const { error } = await supabase.from('device_activations').select(requiredColumns.join(',')).limit(0);
    
    if (error) {
      console.log('❌ device_activations table or some columns are MISSING. Details:', error.message);
      printSQLInstructions();
    } else {
      console.log('✅ device_activations table and all required columns exist.');
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
-- Drop old empty activations table if it exists
DROP TABLE IF EXISTS public.activations CASCADE;

-- Create device_activations table conforming to P0-2 requirements
CREATE TABLE IF NOT EXISTS public.device_activations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_code VARCHAR(20) UNIQUE NOT NULL,
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    duration_days   INTEGER NOT NULL DEFAULT 30,
    plan_index      INTEGER DEFAULT 0,
    device_suffix   VARCHAR(20) DEFAULT '0',
    device_id       TEXT, -- Nullable initially, holds device_id upon redemption
    status          VARCHAR(20) DEFAULT 'pending', -- 'pending', 'used', 'expired'
    is_used         BOOLEAN DEFAULT FALSE,
    created_by      TEXT NOT NULL, -- Email of the creator
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    used_at         TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL -- Expiration timestamp calculated at creation
);

-- Enable RLS and add policy
ALTER TABLE public.device_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.device_activations FOR ALL TO service_role USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_activations_code ON public.device_activations(activation_code);
CREATE INDEX IF NOT EXISTS idx_device_activations_tenant ON public.device_activations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_activations_device ON public.device_activations(device_id);
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
