/*
=============================================================================
Phase 32C.2R.3 FORWARD remediation for p11 performance indexes.

Historical file 20260710180200_p11_performance_indexes.sql remains unchanged
because it is already recorded in staging supabase_migrations.schema_migrations.

Problems in historical p11:
  - CREATE INDEX CONCURRENTLY inside BEGIN/COMMIT (invalid)
  - indexes on transactions_log / invoices before those tables exist in chain
  - wrong columns: invoices(status, due_date); audit_logs(created_at);
    reconciliation_timeline(tenant_id, created_at)

This forward migration creates corrected indexes only when base tables/columns exist.
Uses non-CONCURRENTLY CREATE INDEX (safe on empty/new production DBs; runs in txn).
=============================================================================
*/

-- 1) transactions_log cursor index (table from p19)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'transactions_log'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions_log' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_log_tenant_cursor ON public.transactions_log (tenant_id, created_at DESC, id)';
  END IF;
END $$;

-- 2) ledger_entries.ledger_id (table from p10)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ledger_entries' AND column_name = 'ledger_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ledger_entries_ledger_id ON public.ledger_entries (ledger_id)';
  END IF;
END $$;

-- 3) invoices — use payment_status + created_at (actual p18c columns; no status/due_date)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'payment_status'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_tenant_payment_status_created ON public.invoices (tenant_id, payment_status, created_at DESC)';
  END IF;
END $$;

-- 4) reconciliation_timeline — case_id + timestamp (actual p06 columns)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reconciliation_timeline' AND column_name = 'timestamp'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reconciliation_timeline_case_timestamp ON public.reconciliation_timeline (case_id, timestamp DESC, id)';
  END IF;
END $$;

-- 5) audit_logs — tenant_id + timestamp (actual p05c columns; not created_at)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'timestamp'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_timestamp_cursor ON public.audit_logs (tenant_id, timestamp DESC, id)';
  END IF;
END $$;
