/**
 * P0-4 Migration: Terminal Inventory Schema Validation
 * 
 * Validates existence of:
 * - terminal_inventory new columns: printer_mac_address, printer_model, merchant_id, bank_name
 * 
 * Run: npx ts-node src/db/migrations/004_p0_4_terminal_inventory.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolveMigrationSupabaseCredentials } from './migration-env';

dotenv.config();

const { url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY } = resolveMigrationSupabaseCredentials();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('[Migration] P0-4 Terminal Inventory Schema — Starting...');
  console.log(`[Migration] Target: ${SUPABASE_URL}`);

  const requiredColumns = [
    'printer_mac_address', 'printer_model', 'merchant_id', 'bank_name'
  ];

  console.log('\n[Migration] Checking terminal_inventory table columns...');
  try {
    const { error } = await supabase.from('terminal_inventory').select(requiredColumns.join(',')).limit(0);
    
    if (error) {
      console.log('❌ terminal_inventory new columns are MISSING. Details:', error.message);
      printSQLInstructions();
    } else {
      console.log('✅ terminal_inventory table columns exist.');
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
ALTER TABLE public.terminal_inventory 
  ADD COLUMN IF NOT EXISTS printer_mac_address VARCHAR(50),
  ADD COLUMN IF NOT EXISTS printer_model       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS merchant_id         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_name           VARCHAR(100);
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
