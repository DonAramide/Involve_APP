-- Run this in Supabase SQL Editor to refactor to a Derived Wallet model
-- 1. Drop the incremental update trigger and its function
DROP TRIGGER IF EXISTS tr_update_wallet_on_ledger ON ledger_entries;
DROP FUNCTION IF EXISTS update_wallet_balance();

-- 2. Performance: Add composite index for rapid balance derivation
-- Indexing on (tenant_id, status) allows the DB to sum amounts extremely fast 
-- without scanning failed or pending transactions.
CREATE INDEX IF NOT EXISTS idx_ledger_balance_derivation 
ON ledger_entries(tenant_id, status) 
INCLUDE (amount);

-- 3. (Optional) Flush the wallets table cache to prevent outdated lookups
UPDATE wallets SET balance = 0, updated_at = NOW();
