-- Fix get_tenant_dashboard_stats: read real invoices/students/wallets
-- (previous version hardcoded students/invoices to 0 and filtered ledger incorrectly)

CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_stats(p_tenant_id uuid)
RETURNS TABLE (
  total_revenue numeric,
  active_students integer,
  pending_invoices integer,
  internal_wallet numeric,
  cash_on_hand numeric,
  pending_quasar numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM(COALESCE(i.amount_paid, 0))
      FROM public.invoices i
      WHERE i.tenant_id = p_tenant_id
    ), 0)::numeric AS total_revenue,
    COALESCE((
      SELECT COUNT(*)::integer
      FROM public.students s
      WHERE s.tenant_id = p_tenant_id
         OR s.school_id = p_tenant_id
    ), 0)::integer AS active_students,
    COALESCE((
      SELECT COUNT(*)::integer
      FROM public.invoices i
      WHERE i.tenant_id = p_tenant_id
        AND LOWER(COALESCE(i.payment_status, '')) NOT IN ('paid', 'success', 'completed')
    ), 0)::integer AS pending_invoices,
    COALESCE((
      SELECT w.balance
      FROM public.wallets w
      WHERE w.tenant_id = p_tenant_id
      LIMIT 1
    ), 0)::numeric AS internal_wallet,
    0::numeric AS cash_on_hand,
    COALESCE((
      SELECT SUM(COALESCE(t.amount, 0))
      FROM public.transactions_log t
      WHERE t.tenant_id = p_tenant_id
        AND t.status = 'SUCCESS'
        AND UPPER(COALESCE(t.type, '')) IN (
          'CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT'
        )
    ), 0)::numeric AS pending_quasar;
END;
$$;
