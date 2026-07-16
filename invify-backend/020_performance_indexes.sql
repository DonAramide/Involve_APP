-- 020_performance_indexes.sql
BEGIN;

-- 1. Index on transactions_log for chronological tenant queries and cursor pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_log_tenant_cursor 
ON public.transactions_log(tenant_id, created_at DESC, id);

-- 2. Index on ledger_entries for rapid double-entry sum verification
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_entries_ledger_id 
ON public.ledger_entries(ledger_id);

-- 3. Index on invoices for overdue/reporting background workers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_tenant_status_date 
ON public.invoices(tenant_id, status, due_date);

-- 4. Index for cursor pagination on reconciliation_timeline
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reconciliation_timeline_cursor
ON public.reconciliation_timeline(tenant_id, created_at DESC, id);

-- 5. Index for cursor pagination on audit_logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_cursor
ON public.audit_logs(tenant_id, created_at DESC, id);

COMMIT;
