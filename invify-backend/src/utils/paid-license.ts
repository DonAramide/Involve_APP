import { supabaseAdmin } from '../db/supabase';
import { withoutOptionalTenantColumns } from './sanitize-tenant-updates';

export const ACTIVATION_PLAN_NAMES = ['basic', 'standard', 'premium', 'enterprise'] as const;

export function planNameFromIndex(planIndex: unknown): (typeof ACTIVATION_PLAN_NAMES)[number] {
  const i = Number(planIndex);
  if (Number.isInteger(i) && i >= 0 && i < ACTIVATION_PLAN_NAMES.length) {
    return ACTIVATION_PLAN_NAMES[i];
  }
  return 'basic';
}

/** Paid plan + expiry after a license key is redeemed. */
export function paidLicenseFromActivation(
  activation: { plan_index?: unknown; duration_days?: unknown; expires_at?: string | null },
  now = new Date(),
) {
  const plan = planNameFromIndex(activation.plan_index);
  const durationDays = Number(activation.duration_days);
  const fromDuration = new Date(
    now.getTime() + (durationDays > 0 ? durationDays : 30) * 24 * 60 * 60 * 1000,
  );
  const fromCode = activation.expires_at ? new Date(activation.expires_at) : null;
  const expires =
    fromCode && !Number.isNaN(fromCode.getTime()) && fromCode.getTime() > now.getTime()
      ? fromCode
      : fromDuration;
  return { plan, plan_expires_at: expires.toISOString() };
}

/**
 * Upgrade the tenant off trial/free when a paid activation is redeemed.
 * Retries without plan_expires_at if that column is missing on older DBs.
 */
export async function applyPaidLicenseToTenant(
  tenantId: string,
  paid: { plan: string; plan_expires_at: string },
): Promise<Record<string, unknown> | null> {
  if (!tenantId) return null;

  let payload: Record<string, unknown> = {
    plan: paid.plan,
    plan_expires_at: paid.plan_expires_at,
  };

  let { data, error } = await supabaseAdmin
    .from('tenants')
    .update(payload)
    .eq('id', tenantId)
    .select()
    .maybeSingle();

  const retried = withoutOptionalTenantColumns(payload, error);
  if (error && retried) {
    payload = retried;
    ({ data, error } = await supabaseAdmin
      .from('tenants')
      .update(payload)
      .eq('id', tenantId)
      .select()
      .maybeSingle());
  }

  if (error) {
    console.warn('[applyPaidLicenseToTenant]', error.message);
    return null;
  }
  return data;
}
