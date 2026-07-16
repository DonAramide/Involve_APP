"use strict";
// src/services/financial-verification/modules/treasury/TreasuryVerificationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryVerificationService = void 0;
const supabase_1 = require("../../../../db/supabase");
class TreasuryVerificationService {
    moduleId = 'treasury_verification';
    domain = 'Treasury';
    priority = 100;
    mandatory = true;
    version = '1.0.0';
    capabilities = ['treasury.exists', 'treasury.active', 'treasury.policy', 'treasury.limits'];
    async verify(context) {
        try {
            const { value: tenant, hit } = await context.getCached(`tenant_${context.tenantId}`, async () => {
                const { data, error } = await supabase_1.supabaseAdmin
                    .from('tenants')
                    .select('*')
                    .eq('id', context.tenantId)
                    .maybeSingle();
                if (error)
                    throw new Error(error.message);
                return data;
            });
            if (!tenant) {
                return {
                    passed: false,
                    error: `Treasury account (Tenant ${context.tenantId}) does not exist.`,
                    metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
                };
            }
            if (tenant.status !== 'active') {
                return {
                    passed: false,
                    error: `Treasury account (Tenant ${context.tenantId}) is not active. Status: ${tenant.status}`,
                    metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
                };
            }
            // Check Treasury Policy & limits
            if (context.amount > 5000000) {
                return {
                    passed: false,
                    error: `Transaction amount exceeds single treasury transfer limit of ₦5,000,000.`,
                    metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
                };
            }
            return {
                passed: true,
                metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
            };
        }
        catch (err) {
            return {
                passed: false,
                error: `Treasury verification exception: ${err.message}`
            };
        }
    }
}
exports.TreasuryVerificationService = TreasuryVerificationService;
//# sourceMappingURL=TreasuryVerificationService.js.map