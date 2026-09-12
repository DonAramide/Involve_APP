import { supabaseAdmin } from '../db/supabase';

export const FREE_TRIAL_VA_MESSAGE =
  "You can't access Virtual Account generation on Free Trial mode. Please activate your license to continue.";

export const FREE_TRIAL_VA_CODE = 'FREE_TRIAL_FEATURE_LOCKED';

export const FINANCIAL_PLATFORM_UNPROVISIONED_CODE = 'FINANCIAL_PLATFORM_UNPROVISIONED';

export const FINANCIAL_PLATFORM_UNPROVISIONED_MESSAGE =
  'Virtual accounts need the Financial Platform activated for this school first. On Invify Admin (super admin or tenant admin), open this school → Financial Platform → Activate Platform, then try again.';

export const FINANCIAL_PLATFORM_UNPROVISIONED_ACTION =
  '1. Open Invify Admin\n2. Open this school\n3. Financial Platform → Activate Platform\n4. Return to the tablet and generate the virtual account again';

const PAID_PLANS = new Set(['standard', 'premium', 'pro', 'enterprise', 'lifetime']);
const PROVISIONED_STATUSES = new Set(['active', 'provisioned', 'provisioning']);

export function isTrialPlanName(plan: string): boolean {
  const p = String(plan || '').toLowerCase().trim();
  return p === 'trial' || p === 'free_trial' || p === 'free';
}

/** True when there is no usable Quasar / financial-platform row for this tenant. */
export function isUnprovisionedIntegrationRow(row: { status?: string } | null | undefined): boolean {
  if (!row) return true;
  const status = String(row.status || '').toLowerCase().trim();
  return !PROVISIONED_STATUSES.has(status);
}

/**
 * Returns true when the tenant is on free/trial plan.
 * Soft-fails open (returns false) if the plan column is missing / query fails.
 * Paid `plan` wins over a stale trial `subscription_plan`.
 */
export async function isTenantOnFreeTrial(tenantId: string): Promise<boolean> {
  if (!tenantId) return false;
  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('plan, subscription_plan')
      .eq('id', tenantId)
      .maybeSingle();

    const primary = String((tenant as any)?.plan || '').toLowerCase().trim();
    const secondary = String((tenant as any)?.subscription_plan || '').toLowerCase().trim();
    if (PAID_PLANS.has(primary) || PAID_PLANS.has(secondary)) return false;
    return isTrialPlanName(primary) || isTrialPlanName(secondary);
  } catch (err: any) {
    console.warn('[FreeTrialGuard] plan check soft-failed:', err?.message || err);
    return false;
  }
}

export async function isFinancialPlatformUnprovisioned(tenantId: string): Promise<boolean> {
  if (!tenantId) return true;
  try {
    const { data, error } = await supabaseAdmin
      .from('quasar_integrations')
      .select('id, status')
      .eq('invify_tenant_id', tenantId)
      .maybeSingle();
    if (error) {
      console.warn('[FreeTrialGuard] quasar_integrations lookup failed:', error.message);
      return true;
    }
    return isUnprovisionedIntegrationRow(data as { status?: string } | null);
  } catch (err: any) {
    console.warn('[FreeTrialGuard] platform check soft-failed:', err?.message || err);
    return true;
  }
}

export async function rejectIfFinancialPlatformUnprovisioned(
  res: import('express').Response,
  tenantId: string,
): Promise<boolean> {
  const blocked = await isFinancialPlatformUnprovisioned(tenantId);
  if (!blocked) return false;
  res.status(403).json({
    error: FINANCIAL_PLATFORM_UNPROVISIONED_MESSAGE,
    code: FINANCIAL_PLATFORM_UNPROVISIONED_CODE,
    action: FINANCIAL_PLATFORM_UNPROVISIONED_ACTION,
  });
  return true;
}

export async function rejectIfFreeTrialVa(
  res: import('express').Response,
  tenantId: string,
): Promise<boolean> {
  const blocked = await isTenantOnFreeTrial(tenantId);
  if (!blocked) return false;
  res.status(403).json({
    error: FREE_TRIAL_VA_MESSAGE,
    code: FREE_TRIAL_VA_CODE,
  });
  return true;
}

/** Unprovisioned platform first — that is the actionable block for paid tablets. */
export async function rejectIfVaBlocked(
  res: import('express').Response,
  tenantId: string,
): Promise<boolean> {
  if (await rejectIfFinancialPlatformUnprovisioned(res, tenantId)) return true;
  if (await rejectIfFreeTrialVa(res, tenantId)) return true;
  return false;
}
