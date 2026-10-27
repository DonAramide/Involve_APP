// invify-backend/src/modules/health-insurance/services/health-plan.service.ts
import { supabaseAdmin } from '../../../db/supabase';
import { HealthContext } from '../types';
import { HealthAuditService } from './health-audit.service';
import { activeBankOfferingVersionIds, assertBankOfferingForNewEnrolment } from './bank-hmo-distribution.service';

export class HealthPlanService {
  /**
   * List approved insurance providers.
   */
  static async listProviders() {
    const { data, error } = await supabaseAdmin
      .from('hw_providers')
      .select('id, code, display_name, licence_reference, integration_status, adapter_key, capabilities, last_verified_at')
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
   */
  static async listTenantOffers(ctx: HealthContext) {
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
    const rows = data || [];
    if (allowed === null) return rows;
    return rows.filter((row: any) => {
      const version = Array.isArray(row.hw_plan_versions) ? row.hw_plan_versions[0] : row.hw_plan_versions;
      return Boolean(version?.id) && version.status === 'published' && allowed.has(String(version.id));
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
   * List verified participating healthcare facilities.
   */
  static async listFacilities(filter?: { state?: string; planId?: string }) {
    let query = supabaseAdmin
      .from('hw_facilities')
      .select('id, provider_id, external_ref, name, state, lga, address, phone, services, restrictions, last_verified_at')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (filter?.state) {
      query = query.ilike('state', filter.state);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list facilities: ${error.message}`);
    return data || [];
  }
}
