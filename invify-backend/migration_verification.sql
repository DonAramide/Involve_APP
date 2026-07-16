-- ==============================================================================
-- MIGRATION VERIFICATION SCRIPT (READ-ONLY)
-- Purpose: Consolidates all structural equivalence checks for p09, p10, and p11.
-- Execution: Run this in the Supabase SQL Editor and compare results against
--            the migration_equivalence_checklist.md.
-- ==============================================================================

-- 1. VERIFY TABLES
SELECT 
    table_schema, 
    table_name 
FROM information_schema.tables 
WHERE table_name IN ('webhook_dead_letters', 'ledgers', 'ledger_entries', 'wallets')
  AND table_schema = 'public';

-- 2. VERIFY COLUMNS & DEFAULTS
SELECT 
    table_name, 
    column_name, 
    data_type, 
    column_default, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('webhook_dead_letters', 'ledgers', 'ledger_entries', 'wallets')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. VERIFY CONSTRAINTS (Primary Keys, Foreign Keys, Check Constraints)
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('webhook_dead_letters', 'ledgers', 'ledger_entries', 'wallets')
ORDER BY tc.table_name, tc.constraint_type;

-- 4. VERIFY INDEXES (Performance Indexes from p11 & standard indexes)
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE indexname IN (
    'idx_webhook_dlq_status',
    'idx_transactions_log_tenant_cursor',
    'idx_ledger_entries_ledger_id',
    'idx_invoices_tenant_status_date',
    'idx_reconciliation_timeline_cursor',
    'idx_audit_logs_cursor'
) OR tablename IN ('webhook_dead_letters', 'ledgers', 'ledger_entries', 'wallets');

-- 5. VERIFY FUNCTIONS (Ledger Engine & Double Entry)
SELECT 
    proname AS function_name, 
    pg_get_functiondef(oid) AS function_definition
FROM pg_proc 
WHERE proname IN (
    'prevent_ledger_modification', 
    'process_ledger_double_entry', 
    'request_payout_with_lock'
);

-- 6. VERIFY TRIGGERS (Append-Only Enforcement)
SELECT 
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS event,
    action_timing AS timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('trg_prevent_ledger_modification');

-- 7. VERIFY RLS POLICIES
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename IN ('webhook_dead_letters', 'ledgers', 'ledger_entries', 'wallets');

-- ==============================================================================
-- END OF VERIFICATION SCRIPT
-- ==============================================================================
