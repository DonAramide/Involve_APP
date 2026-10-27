-- Add get_tenant_dashboard_stats function
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
    COALESCE(SUM(amount), 0)::numeric AS total_revenue,
    0::integer AS active_students,
    0::integer AS pending_invoices,
    0::numeric AS internal_wallet,
    0::numeric AS cash_on_hand,
    0::numeric AS pending_quasar
  FROM public.ledger_entries 
  WHERE tenant_id = p_tenant_id AND type = 'credit' AND status = 'COMPLETED';
END;
$$;
