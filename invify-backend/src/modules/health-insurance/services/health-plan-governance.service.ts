import { supabaseAdmin } from '../../../db/supabase';
import { HealthContext } from '../types';
import { HealthAuditService } from './health-audit.service';
import { PlanDraftValidationError, validatePlanDraft } from './plan-draft.validation';

const PLATFORM_AUDIT_TENANT = '00000000-0000-0000-0000-000000000000';

const PLAN_LIST_SELECT = `
  id, provider_id, code, name, status, created_by, created_at, updated_at,
  hw_providers (id, code, display_name, integration_status),
  hw_plan_versions (
    id, version, status, premium_minor, currency, billing_frequency,
    member_categories, eligibility_rules, benefits, exclusions,
    requires_verification, activation_requires_payment,
    effective_from, effective_to, published_at, published_by, created_at
  )
`;

function requireReason(reason: unknown): string {
  const text = String(reason || '').trim();
  if (text.length < 5) {
    throw new PlanDraftValidationError('An audit reason of at least 5 characters is required for this plan action.');
  }
  return text;
}

async function auditPlan(
  ctx: HealthContext,
  action: string,
  resourceId: string,
  changes: Record<string, unknown>
) {
  await HealthAuditService.recordEvent({
    tenantId: PLATFORM_AUDIT_TENANT,
    actorUserId: ctx.userId,
    actorRole: 'platform_admin',
    action,
    resourceType: 'hw_plans',
    resourceId,
    changes,
    viaPlatformAccess: true,
    platformReason: ctx.platformReason
  });
}

export class HealthPlanGovernanceService {
  static async listCatalogue() {
    const [{ data: providers, error: providerError }, { data: plans, error: planError }] = await Promise.all([
      supabaseAdmin
        .from('hw_providers')
        .select('id, code, display_name, integration_status, licence_reference')
        .order('display_name'),
      supabaseAdmin
        .from('hw_plans')
        .select(PLAN_LIST_SELECT)
        .order('updated_at', { ascending: false })
    ]);

    if (providerError) throw new Error(`Failed to list HMO providers: ${providerError.message}`);
    if (planError) throw new Error(`Failed to list health plans: ${planError.message}`);

    return {
      providers: providers || [],
      plans: plans || [],
      lifecycle: {
        plan: ['draft', 'active', 'retired'],
        version: ['draft', 'published', 'retired'],
        note: 'hw_plans has no pending-approval column. A draft is not offered for enrolment until a version is published and the plan is activated.'
      }
    };
  }

  static async createDraft(ctx: HealthContext, body: any) {
    const draft = validatePlanDraft(body);
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('hw_providers')
      .select('id, code, display_name')
      .eq('id', draft.providerId)
      .maybeSingle();

    if (providerError) throw new Error(`Failed to resolve owning HMO: ${providerError.message}`);
    if (!provider) throw new PlanDraftValidationError('Owning HMO provider was not found in hw_providers.', 404);

    const { data: existing } = await supabaseAdmin
      .from('hw_plans')
      .select('id, status')
      .eq('provider_id', draft.providerId)
      .eq('code', draft.code)
      .maybeSingle();

    if (existing?.status === 'retired') {
      throw new PlanDraftValidationError('A retired plan already uses this code for the owning HMO. Choose a new code.');
    }

    let planId = existing?.id as string | undefined;
    if (!planId) {
      const { data: created, error: createError } = await supabaseAdmin
        .from('hw_plans')
        .insert({
          provider_id: draft.providerId,
          code: draft.code,
          name: draft.name,
          status: 'draft',
          created_by: ctx.userId
        })
        .select('id')
        .single();

      if (createError || !created) {
        if (createError?.code === '23505') {
          throw new PlanDraftValidationError('A plan with this code already exists for the owning HMO.', 409);
        }
        throw new Error(createError?.message || 'Failed to create draft plan.');
      }
      planId = created.id;
    } else if (existing && draft.name) {
      await supabaseAdmin.from('hw_plans').update({ name: draft.name }).eq('id', planId).eq('provider_id', draft.providerId);
    }

    const { data: latest } = await supabaseAdmin
      .from('hw_plan_versions')
      .select('version')
      .eq('plan_id', planId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = latest && latest.length > 0 ? Number(latest[0].version) + 1 : 1;
    const { data: version, error: versionError } = await supabaseAdmin
      .from('hw_plan_versions')
      .insert({
        plan_id: planId,
        version: nextVersion,
        status: 'draft',
        premium_minor: draft.premiumMinor,
        currency: draft.currency,
        billing_frequency: draft.billingFrequency,
        member_categories: draft.memberCategories,
        eligibility_rules: draft.eligibilityRules,
        benefits: draft.benefits,
        exclusions: draft.exclusions,
        requires_verification: draft.requiresVerification,
        activation_requires_payment: draft.activationRequiresPayment,
        effective_from: draft.effectiveFrom,
        effective_to: draft.effectiveTo,
        published_at: null,
        published_by: null
      })
      .select('id, version, status')
      .single();

    if (versionError || !version) {
      throw new Error(versionError?.message || 'Failed to save draft plan version.');
    }

    await auditPlan(ctx, 'plan.draft_saved', planId!, {
      providerId: draft.providerId,
      code: draft.code,
      version: version.version,
      premiumMinor: draft.premiumMinor,
      billingFrequency: draft.billingFrequency
    });

    return {
      planId,
      versionId: version.id,
      version: version.version,
      planStatus: 'draft',
      versionStatus: 'draft'
    };
  }

  static async publishVersion(ctx: HealthContext, versionId: string, body: any) {
    const reason = requireReason(body?.reason || ctx.platformReason);
    const { data: version, error } = await supabaseAdmin
      .from('hw_plan_versions')
      .select('id, plan_id, status, version')
      .eq('id', versionId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!version) throw new PlanDraftValidationError('Plan version was not found.', 404);
    if (version.status !== 'draft') {
      throw new PlanDraftValidationError('Only a draft version can be published. Published versions are immutable.');
    }

    const publishedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('hw_plan_versions')
      .update({
        status: 'published',
        published_at: publishedAt,
        published_by: ctx.userId
      })
      .eq('id', versionId)
      .eq('status', 'draft');

    if (updateError) throw new Error(updateError.message);

    await auditPlan(ctx, 'plan.version_published', version.plan_id, {
      versionId,
      version: version.version,
      reason,
      publishedAt
    });

    return { versionId, planId: version.plan_id, versionStatus: 'published', planStatusUnchanged: true };
  }

  static async activatePlan(ctx: HealthContext, planId: string, body: any) {
    const reason = requireReason(body?.reason || ctx.platformReason);
    const { data: plan, error } = await supabaseAdmin
      .from('hw_plans')
      .select('id, provider_id, status, code')
      .eq('id', planId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!plan) throw new PlanDraftValidationError('Plan was not found.', 404);
    if (plan.status === 'retired') throw new PlanDraftValidationError('A retired plan cannot be activated.');

    const { data: published, error: versionError } = await supabaseAdmin
      .from('hw_plan_versions')
      .select('id')
      .eq('plan_id', planId)
      .eq('status', 'published')
      .limit(1);

    if (versionError) throw new Error(versionError.message);
    if (!published || published.length === 0) {
      throw new PlanDraftValidationError('Activate is refused until at least one version is published.');
    }

    const { error: updateError } = await supabaseAdmin
      .from('hw_plans')
      .update({ status: 'active' })
      .eq('id', planId);

    if (updateError) throw new Error(updateError.message);

    await auditPlan(ctx, 'plan.activated', planId, {
      code: plan.code,
      providerId: plan.provider_id,
      reason
    });

    return { planId, status: 'active' };
  }

  static async retirePlan(ctx: HealthContext, planId: string, body: any) {
    const reason = requireReason(body?.reason || ctx.platformReason);
    const { data: plan, error } = await supabaseAdmin
      .from('hw_plans')
      .select('id, provider_id, code, status')
      .eq('id', planId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!plan) throw new PlanDraftValidationError('Plan was not found.', 404);

    const { error: updateError } = await supabaseAdmin
      .from('hw_plans')
      .update({ status: 'retired' })
      .eq('id', planId);

    if (updateError) throw new Error(updateError.message);

    await auditPlan(ctx, 'plan.retired', planId, {
      code: plan.code,
      providerId: plan.provider_id,
      previousStatus: plan.status,
      reason
    });

    return { planId, status: 'retired' };
  }

  static async updateDraftVersion(ctx: HealthContext, versionId: string, body: any) {
    const { data: version, error } = await supabaseAdmin
      .from('hw_plan_versions')
      .select(`
        id, plan_id, version, status, premium_minor, billing_frequency, member_categories,
        eligibility_rules, benefits, exclusions, effective_from, effective_to,
        requires_verification, activation_requires_payment,
        hw_plans (id, provider_id, code, name, status)
      `)
      .eq('id', versionId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!version) throw new PlanDraftValidationError('Plan version was not found.', 404);
    if (version.status !== 'draft') {
      throw new PlanDraftValidationError('Published plan versions are immutable. Save a new draft version instead.');
    }

    const rawPlan = (version as any).hw_plans;
    const plan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
    if (!plan?.provider_id) throw new PlanDraftValidationError('The draft is not linked to an owning HMO.', 404);

    const draft = validatePlanDraft({
      providerId: plan.provider_id,
      code: plan.code,
      name: body?.name || plan.name,
      premiumMinor: body?.premiumMinor ?? body?.premium_minor ?? (body?.premiumNaira === undefined && body?.premium === undefined ? version.premium_minor : undefined),
      premiumNaira: body?.premiumNaira ?? body?.premium,
      billingFrequency: body?.billingFrequency || body?.billing_frequency || version.billing_frequency,
      memberCategories: body?.memberCategories || body?.member_categories || version.member_categories,
      eligibilityRules: body?.eligibilityRules || body?.eligibility_rules || version.eligibility_rules || {},
      benefits: body?.benefits === undefined ? version.benefits || [] : body.benefits,
      exclusions: body?.exclusions === undefined ? version.exclusions || [] : body.exclusions,
      effectiveFrom: body?.effectiveFrom || body?.effective_from || version.effective_from,
      effectiveTo: body?.effectiveTo === undefined && body?.effective_to === undefined ? version.effective_to : (body.effectiveTo || body.effective_to),
      requiresVerification: body?.requiresVerification ?? version.requires_verification,
      activationRequiresPayment: body?.activationRequiresPayment ?? version.activation_requires_payment,
      publishImmediately: body?.publishImmediately,
      status: body?.status
    });

    const { error: versionError } = await supabaseAdmin
      .from('hw_plan_versions')
      .update({
        premium_minor: draft.premiumMinor,
        currency: draft.currency,
        billing_frequency: draft.billingFrequency,
        member_categories: draft.memberCategories,
        eligibility_rules: draft.eligibilityRules,
        benefits: draft.benefits,
        exclusions: draft.exclusions,
        effective_from: draft.effectiveFrom,
        effective_to: draft.effectiveTo,
        requires_verification: draft.requiresVerification,
        activation_requires_payment: draft.activationRequiresPayment
      })
      .eq('id', versionId)
      .eq('status', 'draft');

    if (versionError) throw new Error(versionError.message);

    if (plan.status === 'draft' && draft.name !== plan.name) {
      await supabaseAdmin.from('hw_plans').update({ name: draft.name }).eq('id', plan.id).eq('status', 'draft');
    }

    await auditPlan(ctx, 'plan.draft_updated', plan.id, {
      versionId,
      version: version.version,
      premiumMinor: draft.premiumMinor,
      billingFrequency: draft.billingFrequency
    });

    return { versionId, planId: plan.id, versionStatus: 'draft' };
  }
}
