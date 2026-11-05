import { supabaseAdmin } from '../../db/supabase';

export interface EarningsFilters {
  institutionId: string;
  from?: string;
  to?: string;
  tenantId?: string;
  providerId?: string;
}

function emptyEarnings(institutionId: string, filters: Omit<EarningsFilters, 'institutionId'>) {
  return {
    institution_id: institutionId,
    source: 'ledger',
    posting_enabled: false,
    totals: {
      total_earnings_kobo: 0,
      pending_earnings_kobo: 0,
      available_withdrawal_kobo: 0,
      total_withdrawn_kobo: 0,
      failed_withdrawals_kobo: 0,
      outstanding_settlements_kobo: 0,
    },
    monthly: [] as Array<{ month: string; earnings_kobo: number }>,
    by_provider: [] as Array<{ provider_id: string; earnings_kobo: number }>,
    by_tenant: [] as Array<{ tenant_id: string; earnings_kobo: number }>,
    transactions: [] as Array<Record<string, unknown>>,
    filters,
    note: 'Institution HMO earnings are ledger-backed. No HMO_SERVICE wallet postings exist because fee ownership is unresolved and posting is blocked.',
  };
}

/**
 * Reads only ledger rows tagged as HMO institution earnings for this institution.
 * Does not invent payables from premium invoices.
 */
export async function loadInstitutionHmoEarnings(filters: EarningsFilters) {
  const empty = emptyEarnings(filters.institutionId, {
    from: filters.from,
    to: filters.to,
    tenantId: filters.tenantId,
    providerId: filters.providerId,
  });
  try {
    let query = supabaseAdmin
      .from('ledgers')
      .select('id, tenant_id, reference, created_at, metadata')
      .contains('metadata', { domain: 'hmo_institution_earning', institution_id: filters.institutionId });
    if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId);
    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);
    const { data, error } = await query.limit(500);
    if (error) return empty;
    const rows = (data || []).filter((row: any) => {
      const meta = row.metadata || {};
      if (filters.providerId && meta.provider_id !== filters.providerId) return false;
      return String(meta.institution_id || '') === filters.institutionId;
    });
    return {
      ...empty,
      transactions: rows.map((row: any) => ({
        ledger_id: row.id,
        reference: row.reference,
        tenant_id: row.tenant_id,
        created_at: row.created_at,
        amount_kobo: Number(row.metadata?.institution_share_kobo || 0),
        platform_fee_kobo: Number(row.metadata?.platform_fee_kobo || 0),
        provider_id: row.metadata?.provider_id || null,
        status: row.metadata?.settlement_status || 'UNPOSTED',
      })),
    };
  } catch {
    return empty;
  }
}
