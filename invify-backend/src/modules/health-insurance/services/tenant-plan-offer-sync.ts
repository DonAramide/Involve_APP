/**
 * Ensures linked school tenants can enrol against their assigned HMO's
 * published active plan versions via hw_tenant_plan_offers.
 *
 * HMO portal publish does not historically create tenant offers; mobile and
 * enrolment only read/offer-check that table.
 */
import { supabaseAdmin } from '../../../db/supabase';
import { relationMissing } from './health-institution-context';

async function resolveAssignedProviderId(tenantId: string): Promise<string | null> {
  const settings = await supabaseAdmin
    .from('hw_tenant_settings')
    .select('assigned_provider_id')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (settings.error && !relationMissing(settings.error)) {
    throw new Error(`Failed to read tenant HMO assignment: ${settings.error.message}`);
  }
  if (settings.data?.assigned_provider_id) return String(settings.data.assigned_provider_id);

  const link = await supabaseAdmin
    .from('hw_hmo_school_links')
    .select('provider_id, onboarding_status')
    .eq('tenant_id', tenantId)
    .eq('onboarding_status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (link.error && !relationMissing(link.error)) {
    throw new Error(`Failed to read HMO school link: ${link.error.message}`);
  }
  return link.data?.provider_id ? String(link.data.provider_id) : null;
}

async function defaultFundingForTenant(tenantId: string): Promise<'school' | 'member' | 'employer'> {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('type')
    .eq('id', tenantId)
    .maybeSingle();
  if (error && !relationMissing(error)) {
    throw new Error(`Failed to read tenant mode: ${error.message}`);
  }
  const mode = String(data?.type || 'school').toLowerCase();
  if (mode === 'school') return 'school';
  if (mode === 'retail' || mode === 'services') return 'member';
  return 'employer';
}

/**
 * HMO portal often marks hw_plans.status=active while leaving the latest
 * hw_plan_versions.status=draft (publish checkbox unchecked). Enrolment and
 * tenant offers require published versions, so promote the latest draft of an
 * already-active plan when no published version exists.
 */
async function ensurePublishedVersionsForActivePlans(planIds: string[]): Promise<string[]> {
  if (planIds.length === 0) return [];

  const { data: versions, error: versionError } = await supabaseAdmin
    .from('hw_plan_versions')
    .select('id, plan_id, status, version')
    .in('plan_id', planIds)
    .order('version', { ascending: false });
  if (versionError) throw new Error(`Failed to list plan versions: ${versionError.message}`);

  const byPlan = new Map<string, any[]>();
  for (const row of versions || []) {
    const list = byPlan.get(String(row.plan_id)) || [];
    list.push(row);
    byPlan.set(String(row.plan_id), list);
  }

  const publishedIds: string[] = [];
  for (const planId of planIds) {
    const list = byPlan.get(String(planId)) || [];
    const alreadyPublished = list.find((row) => String(row.status) === 'published');
    if (alreadyPublished) {
      publishedIds.push(String(alreadyPublished.id));
      continue;
    }
    const latestDraft = list.find((row) => String(row.status) === 'draft');
    if (!latestDraft) continue;

    const { data: promoted, error: promoteError } = await supabaseAdmin
      .from('hw_plan_versions')
      .update({
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', latestDraft.id)
      .eq('status', 'draft')
      .select('id')
      .maybeSingle();
    if (promoteError) {
      throw new Error(`Failed to publish draft plan version ${latestDraft.id}: ${promoteError.message}`);
    }
    if (promoted?.id) publishedIds.push(String(promoted.id));
  }
  return publishedIds;
}

async function publishedVersionIdsForProvider(
  providerId: string,
  allowedPlanIds?: string[] | null
): Promise<string[]> {
  let planQuery = supabaseAdmin
    .from('hw_plans')
    .select('id')
    .eq('provider_id', providerId)
    .eq('status', 'active');
  if (allowedPlanIds && allowedPlanIds.length > 0) {
    planQuery = planQuery.in('id', allowedPlanIds);
  }
  const { data: plans, error: planError } = await planQuery;
  if (planError) throw new Error(`Failed to list HMO plans: ${planError.message}`);
  const planIds = (plans || []).map((row: any) => row.id).filter(Boolean);
  if (planIds.length === 0) return [];

  return ensurePublishedVersionsForActivePlans(planIds);
}

/**
 * Upsert active offers for one tenant against its assigned HMO published plans.
 * Returns the number of offer rows written/ensured.
 */
export async function ensureTenantOffersFromAssignedHmo(
  tenantId: string,
  actorUserId?: string | null
): Promise<number> {
  const providerId = await resolveAssignedProviderId(tenantId);
  if (!providerId) return 0;

  const link = await supabaseAdmin
    .from('hw_hmo_school_links')
    .select('allowed_plan_ids')
    .eq('tenant_id', tenantId)
    .eq('provider_id', providerId)
    .eq('onboarding_status', 'active')
    .maybeSingle();
  if (link.error && !relationMissing(link.error)) {
    throw new Error(`Failed to read school plan allow-list: ${link.error.message}`);
  }
  const allowedPlanIds = Array.isArray(link.data?.allowed_plan_ids) ? link.data.allowed_plan_ids : null;

  const versionIds = await publishedVersionIdsForProvider(providerId, allowedPlanIds);
  if (versionIds.length === 0) return 0;

  const funding = await defaultFundingForTenant(tenantId);
  const rows = versionIds.map((planVersionId) => ({
    tenant_id: tenantId,
    plan_version_id: planVersionId,
    default_funding: funding,
    shared_split: null,
    is_active: true,
    created_by: actorUserId || null
  }));

  const { data, error } = await supabaseAdmin
    .from('hw_tenant_plan_offers')
    .upsert(rows, { onConflict: 'tenant_id,plan_version_id' })
    .select('id');

  if (error) throw new Error(`Failed to sync tenant plan offers: ${error.message}`);
  return (data || []).length;
}

/**
 * When an HMO publishes a plan version, offer it to every ACTIVE linked school.
 */
export async function offerPublishedVersionToLinkedSchools(
  providerId: string,
  planVersionId: string,
  planId: string,
  actorUserId?: string | null
): Promise<number> {
  const { data: links, error } = await supabaseAdmin
    .from('hw_hmo_school_links')
    .select('tenant_id, allowed_plan_ids, onboarding_status')
    .eq('provider_id', providerId)
    .eq('onboarding_status', 'active');

  if (error && !relationMissing(error)) {
    throw new Error(`Failed to list linked schools for plan offer sync: ${error.message}`);
  }

  const tenants = (links || []).filter((row: any) => {
    const allowed = row.allowed_plan_ids;
    if (Array.isArray(allowed) && allowed.length > 0) {
      return allowed.map(String).includes(String(planId));
    }
    return Boolean(row.tenant_id);
  });

  if (tenants.length === 0) return 0;

  let written = 0;
  for (const row of tenants) {
    const funding = await defaultFundingForTenant(String(row.tenant_id));
    const { error: upsertError } = await supabaseAdmin.from('hw_tenant_plan_offers').upsert(
      {
        tenant_id: row.tenant_id,
        plan_version_id: planVersionId,
        default_funding: funding,
        shared_split: null,
        is_active: true,
        created_by: actorUserId || null
      },
      { onConflict: 'tenant_id,plan_version_id' }
    );
    if (upsertError) {
      throw new Error(`Failed to offer plan to school ${row.tenant_id}: ${upsertError.message}`);
    }
    written += 1;
  }
  return written;
}
