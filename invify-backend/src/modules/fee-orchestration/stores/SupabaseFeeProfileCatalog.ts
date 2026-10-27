import { FeeTransactionType, PublishedFeeVersion } from '../types';
import { supabaseAdmin } from '../../../db/supabase';
import { OwningAgent, pickOwningAgent } from '../agent-fee-ownership';

function asDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function mapVersion(
  row: any,
  source: PublishedFeeVersion['source'],
  tenantId: string | null,
  agentId: string | null,
): PublishedFeeVersion | null {
  if (!row) return null;
  const created = asDate(row.created_at, new Date(0));
  return {
    profile_id: String(row.profile_id),
    profile_version_id: String(row.id),
    override_version_id: source === 'TENANT_OVERRIDE' ? String(row.id) : null,
    transaction_type: row.transaction_type as FeeTransactionType,
    status: row.status,
    method: row.method,
    percentage_bps: Number(row.percentage_bps || 0),
    flat_amount_kobo: Number(row.flat_amount_kobo || 0),
    min_fee_kobo: Number(row.min_fee_kobo || 0),
    max_fee_kobo: Number(row.max_fee_kobo || 0),
    platform_bps: Number(row.platform_share_bps ?? row.platform_bps ?? 0),
    processor_bps: Number(row.processor_share_bps ?? row.processor_bps ?? 0),
    service_bps: Number(row.service_share_bps ?? row.service_bps ?? 0),
    agent_bps: Number(row.agent_share_bps ?? row.agent_bps ?? 0),
    effective_from: asDate(row.effective_from || row.published_at, created),
    effective_to: row.effective_to ? asDate(row.effective_to, created) : null,
    source,
    tenant_id: tenantId,
    agent_id: agentId,
  };
}

export async function loadOwningAgentForTenant(tenantId: string): Promise<OwningAgent | null> {
  const { data: links } = await supabaseAdmin
    .from('agent_tenants')
    .select('tenant_id, agent_id')
    .eq('tenant_id', tenantId);
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, agent_code')
    .eq('id', tenantId)
    .maybeSingle();
  let agentsByCode: Array<{ id: string; agent_code: string }> = [];
  if (tenant?.agent_code) {
    const { data: agents } = await supabaseAdmin
      .from('agents')
      .select('id, agent_code')
      .eq('agent_code', tenant.agent_code)
      .is('deleted_at', null);
    agentsByCode = (agents || []).map((a: any) => ({ id: String(a.id), agent_code: String(a.agent_code) }));
  }
  const { data: linkAgents } = links?.length
    ? await supabaseAdmin.from('agents').select('id, agent_code').in('id', links.map((l: any) => l.agent_id))
    : { data: [] as any[] };
  const agentTenants = (links || []).map((row: any) => ({
    tenant_id: String(row.tenant_id),
    agent_id: String(row.agent_id),
    agent_code: String((linkAgents || []).find((a: any) => a.id === row.agent_id)?.agent_code || ''),
  }));
  return pickOwningAgent({
    tenantId,
    agentTenants,
    tenantsByCode: tenant ? [{ id: String(tenant.id), agent_code: String(tenant.agent_code || '') }] : [],
    agentsByCode,
  });
}

export class SupabaseFeeProfileCatalog {
  async listCandidateVersions(
    transactionType: FeeTransactionType,
    tenantId: string,
    agentId?: string | null,
  ): Promise<PublishedFeeVersion[]> {
    const out: PublishedFeeVersion[] = [];
    try {
      const { data: globals, error: profileErr } = await supabaseAdmin
        .from('fee_profiles')
        .select('id, transaction_type, scope, agent_id')
        .eq('transaction_type', transactionType)
        .or('scope.eq.GLOBAL,agent_id.is.null');
      if (profileErr) {
        const fallback = await supabaseAdmin
          .from('fee_profiles')
          .select('id, transaction_type')
          .eq('transaction_type', transactionType)
          .maybeSingle();
        if (!fallback.data?.id) return out;
        const { data: versions } = await supabaseAdmin
          .from('fee_profile_versions')
          .select('*')
          .eq('profile_id', fallback.data.id)
          .eq('status', 'PUBLISHED');
        for (const row of versions || []) {
          const mapped = mapVersion({ ...row, transaction_type: transactionType }, 'GLOBAL_PROFILE', null, null);
          if (mapped) out.push(mapped);
        }
        return out;
      }

      const globalProfile = (globals || []).find((p: any) => p.scope === 'GLOBAL' || !p.agent_id) || (globals || [])[0];
      if (globalProfile?.id) {
        const { data: globalVersions } = await supabaseAdmin
          .from('fee_profile_versions')
          .select('*')
          .eq('profile_id', globalProfile.id)
          .eq('status', 'PUBLISHED');
        for (const row of globalVersions || []) {
          const mapped = mapVersion({ ...row, transaction_type: transactionType }, 'GLOBAL_PROFILE', null, null);
          if (mapped) out.push(mapped);
        }
      }

      if (agentId) {
        const { data: agentLink } = await supabaseAdmin
          .from('agent_fee_profiles')
          .select('fee_profile_id, agent_id')
          .eq('agent_id', agentId)
          .eq('transaction_type', transactionType)
          .maybeSingle();
        const agentProfileId = agentLink?.fee_profile_id
          || (globals || []).find((p: any) => p.agent_id === agentId)?.id;
        if (agentProfileId) {
          const { data: agentVersions } = await supabaseAdmin
            .from('fee_profile_versions')
            .select('*')
            .eq('profile_id', agentProfileId)
            .eq('status', 'PUBLISHED');
          for (const row of agentVersions || []) {
            const mapped = mapVersion(
              { ...row, transaction_type: transactionType, profile_id: agentProfileId },
              'AGENT_PROFILE',
              tenantId,
              String(agentId),
            );
            if (mapped) out.push(mapped);
          }
        }
      }
    } catch {
      return out;
    }
    return out;
  }
}
