// invify-backend/src/modules/health-insurance/guards/health-flag.guard.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../../db/supabase';

/**
 * Health Insurance Feature Flag Guard.
 * Default is FALSE unless FEATURE_HEALTH_INSURANCE_ENABLED='true' is explicitly set in env.
 */
export function requireHealthInsuranceEnabled(req: Request, res: Response, next: NextFunction) {
  const isEnabled = process.env.FEATURE_HEALTH_INSURANCE_ENABLED === 'true';

  if (!isEnabled) {
    return res.status(503).json({
      error: {
        code: 'HEALTH_MODULE_DISABLED',
        message: 'Invify Health & Wellness module is currently disabled.',
        details: null
      }
    });
  }

  next();
}

/**
 * Ensures that the tenant has enabled Health Insurance in their hw_tenant_settings.
 */
export async function requireTenantHealthEnabled(tenantId: string): Promise<boolean> {
  const isEnvEnabled = process.env.FEATURE_HEALTH_INSURANCE_ENABLED === 'true';
  if (!isEnvEnabled) return false;

  const { data, error } = await supabaseAdmin
    .from('hw_tenant_settings')
    .select('enabled')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !data) return false;
  return !!data.enabled;
}
