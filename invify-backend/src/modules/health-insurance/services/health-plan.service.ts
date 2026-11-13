// invify-backend/src/modules/health-insurance/services/health-plan.service.ts
import { supabaseAdmin } from '../../../db/supabase';
import { HealthContext } from '../types';
import { HealthAuditService } from './health-audit.service';
import { activeBankOfferingVersionIds, assertBankOfferingForNewEnrolment } from './bank-hmo-distribution.service';
import { ensureTenantOffersFromAssignedHmo } from './tenant-plan-offer-sync';
import { relationMissing } from './health-institution-context';

export class HealthPlanService {
  /**
   * List insurance providers eligible for institution selection / new offerings.
   * Suspended, rejected, draft, and pending HMO organisations are withheld.
   */
  static async listProviders() {
    const { data, error } = await supabaseAdmin
      .from('hw_providers')
      .select('id, code, display_name, licence_reference, integration_status, adapter_key, capabilities, last_verified_at')
      .eq('integration_status', 'verified')
      .order('display_name', { ascending: true });

    if (error) throw new Error(`Failed to list providers: ${error.message}`);
    return data || [];
  }

  /**
   * List available published plans and versions.
   */
  static async listPlans(providerId?: string) {
    let query = supabaseAdmin
      .from('hw_plans')
      .select(`
        id,
        code,
        name,
        status,
        provider_id,
        hw_providers (id, code, display_name),
        hw_plan_versions (
          id,
          version,
          status,
          premium_minor,
          currency,
          billing_frequency,
          member_categories,
          eligibility_rules,
          benefits,
          exclusions,
          effective_from,
          effective_to
        )
      `)
      .eq('status', 'active');

    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list plans: ${error.message}`);
    return data || [];
  }

  /**
   * List plan versions offered by the caller's tenant.
   * Syncs published plans from the assigned HMO when offer rows are missing
   * (HMO portal publish historically did not create hw_tenant_plan_offers).
   */
  static async listTenantOffers(ctx: HealthContext) {
    try {
      await ensureTenantOffersFromAssignedHmo(ctx.tenantId, ctx.userId);
    } catch (err: any) {
      // Soft-fail sync so an empty catalogue still returns configured offers.
      console.warn('[HealthPlanService.listTenantOffers] offer sync skipped:', err?.message || err);
    }

    const { data, error } = await supabaseAdmin
      .from('hw_tenant_plan_offers')
      .select(`
        id,
        default_funding,
        shared_split,
        is_active,
        hw_plan_versions (
          id,
          version,
          status,
          premium_minor,
          currency,
          billing_frequency,
          member_categories,
          benefits,
          exclusions,
          hw_plans (
            id,
            code,
            name,
            hw_providers (id, code, display_name)
          )
        )
      `)
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true);

    if (error) throw new Error(`Failed to list tenant offers: ${error.message}`);
    const allowed = await activeBankOfferingVersionIds(ctx.tenantId);
    if (allowed === 'unavailable') {
      throw new Error('Bank offerings could not be confirmed. The plan list was not returned.');
    }
    const rows = (data || []).filter((row: any) => {
      const version = Array.isArray(row.hw_plan_versions) ? row.hw_plan_versions[0] : row.hw_plan_versions;
      return Boolean(version?.id) && String(version.status) === 'published';
    });
    if (allowed === null) return rows;
    return rows.filter((row: any) => {
      const version = Array.isArray(row.hw_plan_versions) ? row.hw_plan_versions[0] : row.hw_plan_versions;
      return allowed.has(String(version.id));
    });
  }

  /**
   * Configure a plan offer for a tenant.
   */
  static async configureTenantOffer(
    ctx: HealthContext,
    params: {
      planVersionId: string;
      defaultFunding: 'school' | 'employer' | 'member' | 'shared';
      sharedSplit?: { tenant_bps: number; member_bps: number };
    }
  ) {
    if (params.defaultFunding === 'shared') {
      const split = params.sharedSplit;
      if (!split || split.tenant_bps + split.member_bps !== 10000) {
        throw new Error('Shared funding model requires tenant_bps + member_bps to total 10,000 (100%)');
      }
    }

    const body = params as any;
    const planVersionId = String(body.planVersionId || body.plan_version_id || '');
    await assertBankOfferingForNewEnrolment(ctx.tenantId, planVersionId);

    const { data, error } = await supabaseAdmin
      .from('hw_tenant_plan_offers')
      .upsert(
        {
          tenant_id: ctx.tenantId,
          plan_version_id: planVersionId,
          default_funding: params.defaultFunding,
          shared_split: params.sharedSplit || null,
          is_active: true,
          created_by: ctx.userId
        },
        { onConflict: 'tenant_id,plan_version_id' }
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to configure tenant offer: ${error.message}`);

    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'plan_offer.configured',
      resourceType: 'hw_tenant_plan_offers',
      resourceId: data.id,
      changes: params
    });

    return data;
  }

  /**
   * List verified participating healthcare facilities for the tenant's assigned HMO.
   * Facilities are written by the HMO portal (hw_facilities.provider_id) and appear here
   * as soon as they are active — no separate tenant sync job.
   */
  static async listFacilities(
    ctx: HealthContext,
    filter?: { state?: string; planId?: string; providerId?: string }
  ) {
    let providerId = filter?.providerId ? String(filter.providerId) : '';
    if (!providerId) {
      const settings = await supabaseAdmin
        .from('hw_tenant_settings')
        .select('assigned_provider_id')
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle();
      if (settings.error && !relationMissing(settings.error)) {
        throw new Error(`Failed to resolve assigned HMO for facilities: ${settings.error.message}`);
      }
      providerId = settings.data?.assigned_provider_id ? String(settings.data.assigned_provider_id) : '';
      if (!providerId) {
        const link = await supabaseAdmin
          .from('hw_hmo_school_links')
          .select('provider_id')
          .eq('tenant_id', ctx.tenantId)
          .eq('onboarding_status', 'active')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (link.error && !relationMissing(link.error)) {
          throw new Error(`Failed to resolve HMO school link for facilities: ${link.error.message}`);
        }
        providerId = link.data?.provider_id ? String(link.data.provider_id) : '';
      }
    }
    if (!providerId) {
      return [];
    }

    let query = supabaseAdmin
      .from('hw_facilities')
      .select(
        'id, provider_id, external_ref, name, state, lga, address, phone, services, restrictions, last_verified_at, is_active'
      )
      .eq('is_active', true)
      .eq('provider_id', providerId)
      .order('name', { ascending: true });

    if (filter?.state) {
      query = query.ilike('state', filter.state);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list facilities: ${error.message}`);
    return data || [];
  }
}
