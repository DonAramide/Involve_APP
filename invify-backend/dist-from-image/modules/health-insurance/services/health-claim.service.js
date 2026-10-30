"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthClaimService = void 0;
// invify-backend/src/modules/health-insurance/services/health-claim.service.ts
const supabase_1 = require("../../../db/supabase");
const sandbox_adapter_1 = require("../adapters/sandbox.adapter");
class HealthClaimService {
    /**
     * List claims/authorisations for a tenant.
     */
    static async listClaims(ctx, policyId) {
        let query = supabase_1.supabaseAdmin
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
        if (policyId)
            query = query.eq('policy_id', policyId);
        const { data, error } = await query;
        if (error)
            throw new Error(`Failed to list claims: ${error.message}`);
        return data || [];
    }
    /**
     * Look up claim status from provider.
     */
    static async lookupClaimStatus(ctx, claimReference) {
        const isProd = process.env.NODE_ENV === 'production' || process.env.BUILD_VARIANT === 'prod';
        // In staging / dev, use sandbox adapter
        if (!isProd) {
            const sandbox = new sandbox_adapter_1.SandboxHealthProviderAdapter();
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
exports.HealthClaimService = HealthClaimService;
//# sourceMappingURL=health-claim.service.js.map