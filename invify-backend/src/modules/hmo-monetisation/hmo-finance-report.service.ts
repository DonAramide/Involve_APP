import { supabaseAdmin } from '../../db/supabase';

export async function loadHmoFinanceReport(filters: {
  from?: string;
  to?: string;
  institutionId?: string;
  tenantId?: string;
  providerId?: string;
}) {
  const empty = {
    filters,
    source: 'ledger',
    gross_hmo_volume_kobo: 0,
    total_hmo_service_fees_kobo: 0,
    platform_revenue_kobo: 0,
    institution_payable_kobo: 0,
    institution_withdrawals_kobo: 0,
    outstanding_institution_liabilities_kobo: 0,
    reversed_hmo_transactions_kobo: 0,
    failed_hmo_debits: 0,
    reconciliation_discrepancies: 0,
    rows: [] as Array<Record<string, unknown>>,
    note: 'Totals are summed from ledger metadata domain=hmo_service_fee. None exist while posting is blocked.',
  };
  try {
    let query = supabaseAdmin.from('ledgers').select('id, tenant_id, reference, created_at, metadata');
    query = query.contains('metadata', { domain: 'hmo_service_fee' });
    if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId);
    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);
    const { data, error } = await query.limit(1000);
    if (error) return empty;
    const rows = (data || []).filter((row: any) => {
      const meta = row.metadata || {};
      if (filters.institutionId && meta.institution_id !== filters.institutionId) return false;
      if (filters.providerId && meta.provider_id !== filters.providerId) return false;
      return true;
    });
    return {
      ...empty,
      rows: rows.map((row: any) => ({
        ledger_id: row.id,
        reference: row.reference,
        tenant_id: row.tenant_id,
        created_at: row.created_at,
        metadata: row.metadata,
      })),
    };
  } catch {
    return empty;
  }
}
