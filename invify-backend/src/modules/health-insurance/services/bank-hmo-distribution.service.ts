import { supabaseAdmin } from '../../../db/supabase';
import { loadAttributedTenantIds } from '../../agent-portal/services/agent-fee-read-model';
import { commandPremiumTotals } from './finance-summary';
import {
  BANK_PRICE_POLICY_MESSAGE,
  catalogueCategories,
  filterCatalogue,
  offeringViews,
  paginate,
  shapePublishedCatalogue,
} from './bank-hmo-catalogue';
import { decideOfferingChange, normalizeReason, tenantSelectionDecision } from './bank-hmo-offering-rules';

const PLAN_SELECT = `
  id, code, name, status, provider_id,
  hw_providers (id, code, display_name, licence_reference, integration_status),
  hw_plan_versions (
    id, version, status, premium_minor, currency, billing_frequency,
    member_categories, eligibility_rules, benefits, exclusions,
    effective_from, effective_to, published_at
  )
`;

async function loadPublishedPlans() {
  const { data, error } = await supabaseAdmin
    .from('hw_plans')
    .select(PLAN_SELECT)
    .eq('status', 'active');
  if (error) throw new Error(`Failed to read the published HMO catalogue: ${error.message}`);
  return shapePublishedCatalogue(data || []);
}

export class BankHmoDistributionService {
  static async catalogue(search: string, page: unknown, limit: unknown) {
    const plans = filterCatalogue(await loadPublishedPlans(), search);
    const pageResult = paginate(plans, page, limit);
    const providers = new Set(plans.map((plan) => plan.providerId));
    return {
      ...pageResult,
      publishedHmos: providers.size,
      publishedPlans: plans.length,
      pricePolicy: BANK_PRICE_POLICY_MESSAGE,
    };
  }

  static async providerDetail(providerId: string) {
    const plans = (await loadPublishedPlans()).filter((plan) => plan.providerId === providerId);
    if (plans.length === 0) return null;
    const { data, error } = await supabaseAdmin
      .from('hw_facilities')
      .select('id, provider_id, name, state, lga, services, is_active, source')
      .eq('provider_id', providerId)
      .eq('is_active', true);
    return {
      providerId,
      providerName: plans[0].providerName,
      providerCode: plans[0].providerCode,
      plans,
      facilities: error ? [] : (data || []),
      facilitiesUnavailable: error ? 'Provider locations could not be read. This is not an empty network.' : null,
    };
  }

  static async facilities(search: string, page: unknown, limit: unknown) {
    const plans = await loadPublishedPlans();
    const allowed = new Set(plans.map((plan) => plan.providerId));
    const { data, error } = await supabaseAdmin
      .from('hw_facilities')
      .select('id, provider_id, name, state, lga, services, is_active')
      .eq('is_active', true);
    if (error) throw new Error(`Failed to read healthcare providers: ${error.message}`);
    const names = new Map(plans.map((plan) => [plan.providerId, plan.providerName]));
    const rows = (data || [])
      .filter((row: any) => allowed.has(String(row.provider_id)))
      .map((row: any) => ({
        id: row.id,
        providerId: row.provider_id,
        hmoName: names.get(String(row.provider_id)) || '',
        name: row.name,
        state: row.state,
        lga: row.lga,
        services: row.services || [],
      }))
      .filter((row) => {
        const needle = String(search || '').replace(/[%_\\]/g, '').trim().toLowerCase().slice(0, 64);
        if (!needle) return true;
        return `${row.hmoName} ${row.name} ${row.state || ''} ${row.lga || ''}`.toLowerCase().includes(needle);
      });
    return paginate(rows, page, limit);
  }

  static async offerings(agentId: string, search: string, page: unknown, limit: unknown) {
    const plans = filterCatalogue(await loadPublishedPlans(), search);
    const owned = await loadOwnedOfferings(agentId);
    return {
      ...paginate(offeringViews(plans, owned.rows), page, limit),
      offeringsUnavailable: owned.unavailable,
      pricePolicy: BANK_PRICE_POLICY_MESSAGE,
    };
  }

  static async availableForTenants(agentId: string) {
    const owned = await loadOwnedOfferings(agentId);
    if (owned.unavailable) {
      return { data: [], unavailable: owned.unavailable };
    }
    const activeIds = new Set(owned.rows.filter((row) => row.is_active).map((row) => String(row.plan_version_id)));
    const plans = await loadPublishedPlans();
    const rows = offeringViews(plans, owned.rows).filter((row) => activeIds.has(row.versionId) && row.activeForBank);
    return { data: rows, unavailable: null as string | null };
  }

  static async setOffering(input: {
    agentId: string;
    actorUserId: string;
    planVersionId: string;
    active: boolean;
    reason: string;
  }) {
    const version = await supabaseAdmin
      .from('hw_plan_versions')
      .select('id, status, premium_minor, currency, hw_plans(status)')
      .eq('id', input.planVersionId)
      .maybeSingle();
    if (version.error) throw offeringFailure(500, 'PLAN_VERSION_LOOKUP_FAILED', 'The plan version could not be read. No offering was changed.');
    const versionRow = version.data as any;
    const planRow = Array.isArray(versionRow?.hw_plans) ? versionRow.hw_plans[0] : versionRow?.hw_plans;
    const existing = await supabaseAdmin
      .from('hw_bank_hmo_offerings')
      .select('id, is_active, agent_id')
      .eq('agent_id', input.agentId)
      .eq('plan_version_id', input.planVersionId)
      .maybeSingle();
    if (existing.error) throw offeringFailure(500, 'OFFERING_LOOKUP_FAILED', 'The bank offering could not be read. No offering was changed.');
    const decision = decideOfferingChange({
      planVersionId: input.planVersionId,
      exists: Boolean(existing.data),
      currentActive: existing.data ? Boolean(existing.data.is_active) : null,
      requestedActive: input.active,
      versionStatus: versionRow?.status || null,
      planStatus: planRow?.status || null,
      reason: input.reason,
    });
    if (!decision.ok) throw offeringFailure(decision.status, decision.code, decision.message);
    if (decision.action === 'unchanged') {
      return {
        offeringId: existing.data?.id || null,
        planVersionId: input.planVersionId,
        isActive: decision.nextActive,
        action: decision.action,
        referencePremiumMinor: versionRow?.premium_minor ?? null,
        currency: versionRow?.currency || 'NGN',
      };
    }
    const reason = normalizeReason(input.reason);
    let offeringId = existing.data?.id as string | undefined;
    if (!existing.data) {
      const inserted = await supabaseAdmin
        .from('hw_bank_hmo_offerings')
        .insert({
          agent_id: input.agentId,
          plan_version_id: input.planVersionId,
          is_active: true,
          reason,
          created_by: input.actorUserId,
          updated_by: input.actorUserId,
        })
        .select('id, is_active')
        .maybeSingle();
      if (inserted.error || !inserted.data) {
        throw offeringFailure(mapWriteStatus(inserted.error), 'OFFERING_WRITE_FAILED', mapWriteMessage(inserted.error));
      }
      offeringId = inserted.data.id;
    } else {
      const updated = await supabaseAdmin
        .from('hw_bank_hmo_offerings')
        .update({ is_active: decision.nextActive, reason, updated_by: input.actorUserId })
        .eq('id', existing.data.id)
        .eq('agent_id', input.agentId)
        .eq('is_active', existing.data.is_active)
        .select('id, is_active')
        .maybeSingle();
      if (updated.error) throw offeringFailure(mapWriteStatus(updated.error), 'OFFERING_WRITE_FAILED', mapWriteMessage(updated.error));
      if (!updated.data) {
        const again = await supabaseAdmin
          .from('hw_bank_hmo_offerings')
          .select('id, is_active')
          .eq('id', existing.data.id)
          .eq('agent_id', input.agentId)
          .maybeSingle();
        if (again.data && Boolean(again.data.is_active) === decision.nextActive) {
          return {
            offeringId: again.data.id,
            planVersionId: input.planVersionId,
            isActive: decision.nextActive,
            action: 'unchanged',
            referencePremiumMinor: versionRow?.premium_minor ?? null,
            currency: versionRow?.currency || 'NGN',
          };
        }
        throw offeringFailure(409, 'OFFERING_CONFLICT', 'The offering changed while it was being saved. Refresh and try again.');
      }
      offeringId = updated.data.id;
    }
    const event = await supabaseAdmin.from('hw_bank_hmo_offering_events').insert({
      offering_id: offeringId,
      agent_id: input.agentId,
      action: decision.action,
      previous_is_active: existing.data ? Boolean(existing.data.is_active) : null,
      new_is_active: decision.nextActive,
      actor_user_id: input.actorUserId,
      reason,
    });
    if (event.error) {
      if (offeringId) {
        await supabaseAdmin
          .from('hw_bank_hmo_offerings')
          .update({
            is_active: existing.data ? Boolean(existing.data.is_active) : false,
            reason: 'Reverted because the audit event was not saved',
            updated_by: input.actorUserId,
          })
          .eq('id', offeringId)
          .eq('agent_id', input.agentId);
      }
      throw offeringFailure(500, 'OFFERING_AUDIT_FAILED', 'The status change was not kept because its audit event could not be saved.');
    }
    return {
      offeringId,
      planVersionId: input.planVersionId,
      isActive: decision.nextActive,
      action: decision.action,
      referencePremiumMinor: versionRow?.premium_minor ?? null,
      currency: versionRow?.currency || 'NGN',
    };
  }

  static async validateTenantSelection(agentId: string, tenantId: string, planVersionId: string) {
    const attributed = await tenantBelongsToAgent(agentId, tenantId);
    if (attributed === 'unavailable') {
      throw offeringFailure(503, 'TENANT_LOOKUP_FAILED', 'The bank and tenant relationship could not be confirmed. No selection was saved.');
    }
    if (!attributed) {
      throw offeringFailure(403, 'TENANT_NOT_ATTRIBUTED', 'That tenant is not attributed to this bank.');
    }
    const gate = await bankOfferingGate(agentId, planVersionId);
    const decision = tenantSelectionDecision({
      attributedToBank: true,
      offeringActive: gate.offeringActive,
      versionPublished: gate.versionPublished,
      planActive: gate.planActive,
    });
    if (!decision.allowed) throw offeringFailure(409, decision.code, decision.message);
    return { eligible: true, planVersionId, referencePremiumMinor: gate.referencePremiumMinor, currency: gate.currency };
  }

  static async overview(agentId: string, agentCode: string) {
    const plans = await loadPublishedPlans();
    const attributed = await loadAttributedTenantIds(agentId, agentCode).catch(() => ({
      tenantIds: [] as string[],
      attributedTenants: [] as any[],
    }));
    const tenantIds = attributed.tenantIds.filter(Boolean);
    const enrolments = await countByTenant('hw_enrolments', 'status', tenantIds);
    const claims = await countByTenant('hw_claim_status_records', 'status', tenantIds);
    const premiums = await premiumSnapshot(tenantIds);
    const offeringCount = await supabaseAdmin
      .from('hw_bank_hmo_offerings')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('is_active', true);
    return {
      publishedHmos: new Set(plans.map((plan) => plan.providerId)).size,
      publishedPlans: plans.length,
      categories: catalogueCategories(plans),
      activeBankOfferings: offeringCount.error ? null : (offeringCount.count || 0),
      activeBankOfferingsReason: offeringCount.error
        ? 'Active bank offerings could not be read. This is not a zero count.'
        : null,
      attributedTenants: tenantIds.length,
      enrolments,
      claims: {
        ...claims,
        disbursed: null,
        disbursedReason: 'Claim status does not record a disbursement. Approved or settled is not treated as paid.',
      },
      premiums,
      operatingExpenses: null,
      netOperatingProfit: null,
      financeUnavailableReason: 'No HMO operating-expense or recognized-revenue source is available for this bank. Cash collected is not profit.',
      pricePolicy: BANK_PRICE_POLICY_MESSAGE,
    };
  }

  static async tenants(agentId: string, agentCode: string) {
    const attributed = await loadAttributedTenantIds(agentId, agentCode);
    return (attributed.attributedTenants || []).map((row: any) => ({
      id: row.tenant_id || row.id,
      name: row.name || row.business_name || row.trading_name || 'Tenant',
      status: row.status || null,
      createdAt: row.created_at || null,
      hmoSelection: 'validated_on_enrolment',
      hmoSelectionReason: 'A new enrolment is accepted only when this bank has an active offering for a still-published plan version. Existing enrolments and invoices are not changed.',
    }));
  }
}

async function loadOwnedOfferings(agentId: string) {
  const { data, error } = await supabaseAdmin
    .from('hw_bank_hmo_offerings')
    .select('id, plan_version_id, is_active, reason')
    .eq('agent_id', agentId);
  if (error) {
    return { rows: [] as any[], unavailable: 'Bank offerings could not be read. This is not an empty offering list.' };
  }
  return { rows: data || [], unavailable: null as string | null };
}

function offeringFailure(status: number, code: string, message: string) {
  const error = new Error(message) as Error & { status: number; code: string };
  error.status = status;
  error.code = code;
  return error;
}

function mapWriteStatus(error: { code?: string; message?: string } | null) {
  const text = `${error?.code || ''} ${error?.message || ''}`;
  if (text.includes('only a BANK')) return 403;
  if (text.includes('published plan version') || text.includes('23505')) return 409;
  return 500;
}

function mapWriteMessage(error: { message?: string } | null) {
  const message = String(error?.message || '');
  if (message.includes('only a BANK')) return 'Only a bank institute can own this offering.';
  if (message.includes('published plan version')) return 'Only a published plan version can be activated.';
  if (message.includes('duplicate') || message.includes('uq_hw_bank_hmo_offering')) return 'This bank already has an offering for that plan version. Refresh and try again.';
  return 'The offering was not saved.';
}

async function tenantBelongsToAgent(agentId: string, tenantId: string): Promise<boolean | 'unavailable'> {
  const tenant = await supabaseAdmin.from('tenants').select('id, agent_code').eq('id', tenantId).maybeSingle();
  if (tenant.error) return 'unavailable';
  const agent = await supabaseAdmin.from('agents').select('id, agent_code').eq('id', agentId).maybeSingle();
  if (agent.error) return 'unavailable';
  if (!tenant.data || !agent.data) return false;
  if (tenant.data.agent_code && agent.data.agent_code && String(tenant.data.agent_code).toLowerCase() === String(agent.data.agent_code).toLowerCase()) {
    return true;
  }
  const link = await supabaseAdmin
    .from('agent_tenants')
    .select('tenant_id')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();
  if (link.error) return 'unavailable';
  return Boolean(link.data);
}

async function bankOfferingGate(agentId: string, planVersionId: string) {
  const version = await supabaseAdmin
    .from('hw_plan_versions')
    .select('id, status, premium_minor, currency, hw_plans(status)')
    .eq('id', planVersionId)
    .maybeSingle();
  if (version.error) throw offeringFailure(503, 'PLAN_VERSION_LOOKUP_FAILED', 'The plan version could not be confirmed. No selection was saved.');
  const versionRow = version.data as any;
  const planRow = Array.isArray(versionRow?.hw_plans) ? versionRow.hw_plans[0] : versionRow?.hw_plans;
  const offering = await supabaseAdmin
    .from('hw_bank_hmo_offerings')
    .select('is_active')
    .eq('agent_id', agentId)
    .eq('plan_version_id', planVersionId)
    .maybeSingle();
  if (offering.error) throw offeringFailure(503, 'OFFERING_LOOKUP_FAILED', 'The bank offering could not be confirmed. No selection was saved.');
  return {
    offeringActive: Boolean(offering.data?.is_active),
    versionPublished: versionRow?.status === 'published',
    planActive: planRow?.status === 'active',
    referencePremiumMinor: versionRow?.premium_minor ?? null,
    currency: versionRow?.currency || 'NGN',
  };
}

export async function distributingBankId(tenantId: string): Promise<string | null | 'unavailable'> {
  const tenant = await supabaseAdmin.from('tenants').select('id, agent_code').eq('id', tenantId).maybeSingle();
  if (tenant.error) return 'unavailable';
  if (tenant.data?.agent_code) {
    const agent = await supabaseAdmin
      .from('agents')
      .select('id, institution_type')
      .ilike('agent_code', String(tenant.data.agent_code))
      .is('deleted_at', null)
      .maybeSingle();
    if (agent.error) return 'unavailable';
    if (agent.data && String(agent.data.institution_type || '').toUpperCase() === 'BANK') return agent.data.id;
  }
  const link = await supabaseAdmin
    .from('agent_tenants')
    .select('agent_id')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .limit(1);
  if (link.error) return 'unavailable';
  const linkedId = link.data?.[0]?.agent_id;
  if (!linkedId) return null;
  const agent = await supabaseAdmin.from('agents').select('id, institution_type').eq('id', linkedId).maybeSingle();
  if (agent.error) return 'unavailable';
  if (agent.data && String(agent.data.institution_type || '').toUpperCase() === 'BANK') return agent.data.id;
  return null;
}

export async function activeBankOfferingVersionIds(tenantId: string): Promise<Set<string> | null | 'unavailable'> {
  const agentId = await distributingBankId(tenantId);
  if (agentId === 'unavailable') return 'unavailable';
  if (!agentId) return null;
  const { data, error } = await supabaseAdmin
    .from('hw_bank_hmo_offerings')
    .select('plan_version_id')
    .eq('agent_id', agentId)
    .eq('is_active', true);
  if (error) return 'unavailable';
  return new Set((data || []).map((row: any) => String(row.plan_version_id)));
}

export async function assertBankOfferingForNewEnrolment(tenantId: string, planVersionId: string) {
  const agentId = await distributingBankId(tenantId);
  if (agentId === 'unavailable') throw new Error('The tenant bank relationship could not be confirmed. The enrolment was not created.');
  if (!agentId) return;
  const gate = await bankOfferingGate(agentId, planVersionId);
  const decision = tenantSelectionDecision({
    attributedToBank: true,
    offeringActive: gate.offeringActive,
    versionPublished: gate.versionPublished,
    planActive: gate.planActive,
  });
  if (!decision.allowed) throw new Error(decision.message);
}

async function countByTenant(table: string, field: string, tenantIds: string[]) {
  if (tenantIds.length === 0) {
    return { total: 0, byStatus: {}, unavailable: null as string | null };
  }
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(field)
    .in('tenant_id', tenantIds.slice(0, 200));
  if (error) {
    return {
      total: null,
      byStatus: {},
      unavailable: `${table} could not be read for this bank's tenants. This is not a zero count.`,
    };
  }
  const byStatus: Record<string, number> = {};
  for (const row of data || []) {
    const status = String((row as any)[field] || 'unknown');
    byStatus[status] = (byStatus[status] || 0) + 1;
  }
  return { total: (data || []).length, byStatus, unavailable: null as string | null };
}

async function premiumSnapshot(tenantIds: string[]) {
  if (tenantIds.length === 0) {
    return {
      billedMinor: 0,
      collectedMinor: 0,
      reconciledMinor: 0,
      outstandingMinor: 0,
      unavailable: null as string | null,
    };
  }
  const ids = tenantIds.slice(0, 200);
  const invoices = await supabaseAdmin
    .from('hw_premium_invoices')
    .select('status, amount_due_minor, amount_paid_minor, issued_at, currency')
    .in('tenant_id', ids);
  const payments = await supabaseAdmin
    .from('hw_payments')
    .select('status, amount_minor, created_at, reconciled_at')
    .in('tenant_id', ids);
  if (invoices.error || payments.error) {
    return {
      billedMinor: null,
      collectedMinor: null,
      reconciledMinor: null,
      outstandingMinor: null,
      unavailable: 'Premium invoices or payments could not be read for this bank. This is not a zero total.',
    };
  }
  const totals = commandPremiumTotals(invoices.data || [], payments.data || [], null, null);
  return { ...totals, unavailable: null as string | null };
}
