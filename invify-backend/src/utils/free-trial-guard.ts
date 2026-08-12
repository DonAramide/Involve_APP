import { supabaseAdmin } from '../db/supabase';

export const FREE_TRIAL_VA_MESSAGE =
  "You can't access Virtual Account generation on Free Trial mode. Please activate your license to continue.";

export const FREE_TRIAL_VA_CODE = 'FREE_TRIAL_FEATURE_LOCKED';

/**
 * Returns true when the tenant is on free/trial plan.
 * Soft-fails open (returns false) if the plan column is missing / query fails.
 */
export async function isTenantOnFreeTrial(tenantId: string): Promise<boolean> {
  if (!tenantId) return false;
  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('plan, subscription_plan')
      .eq('id', tenantId)
      .maybeSingle();

    const plan = String(
      (tenant as any)?.plan || (tenant as any)?.subscription_plan || '',
    ).toLowerCase();

    return plan === 'trial' || plan === 'free_trial' || plan === 'free';
  } catch (err: any) {
    console.warn('[FreeTrialGuard] plan check soft-failed:', err?.message || err);
    return false;
  }
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
