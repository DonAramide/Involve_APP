// invify-backend/src/modules/health-insurance/services/health-claim.service.ts
import { supabaseAdmin } from '../../../db/supabase';
import { HealthContext } from '../types';
import { SandboxHealthProviderAdapter } from '../adapters/sandbox.adapter';

export class HealthClaimService {
  /**
   * List claims/authorisations for a tenant.
   */
  static async listClaims(ctx: HealthContext, policyId?: string) {
    let query = supabaseAdmin
      .from('hw_claim_status_records')
      .select(`
        id,
        claim_reference,
        record_type,
        status,
        submitted_date,
        status_date,
        authorised_amount_minor,
        currency,
        rejection_reason,
        last_synced_at,
        hw_members (
          id,
          member_category,
          students (first_name, last_name, admission_number)
        ),
        hw_facilities (
          name,
          state,
          lga
        )
      `)
      .eq('tenant_id', ctx.tenantId)
      .order('status_date', { ascending: false });

    if (policyId) query = query.eq('policy_id', policyId);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list claims: ${error.message}`);
    return data || [];
  }

  /**
   * Look up claim status from provider.
   */
  static async lookupClaimStatus(ctx: HealthContext, claimReference: string) {
    const isProd = process.env.NODE_ENV === 'production' || process.env.BUILD_VARIANT === 'prod';
    
    // In staging / dev, use sandbox adapter
    if (!isProd) {
      const sandbox = new SandboxHealthProviderAdapter();
      const statusRes = await sandbox.getClaimStatus(claimReference);
      return {
        connected: true,
        isSandbox: true,
        data: statusRes
      };
    }

    // In production without live insurer integration, return explicit not-connected state
    return {
      connected: false,
      isSandbox: false,
      message: 'Automated claim status lookup is not configured for this provider. Contact HMO directly.'
    };
  }
}
