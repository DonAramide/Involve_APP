"use strict";
// invify-backend/src/modules/financial-platform/activation/FinancialPlatformActivationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialPlatformActivationService = void 0;
const db_1 = require("../../../utils/db"); // Placeholder DB Client
const quasar_tenant_key_environment_1 = require("../../../integrations/quasar/quasar-tenant-key-environment");
class FinancialPlatformActivationService {
    lockProvider;
    activationSaga;
    constructor(lockProvider, activationSaga) {
        this.lockProvider = lockProvider;
        this.activationSaga = activationSaga;
    }
    /**
     * Orchestrates the financial platform activation using a saga pattern.
     * Ensures idempotency and concurrency control.
     */
    async activateTenant(tenantId, context) {
        const lockAcquired = await this.lockProvider.acquireLock(tenantId, 60);
        if (!lockAcquired) {
            throw new Error(`Activation for tenant ${tenantId} is already in progress.`);
        }
        try {
            // Idempotency Check — allow resume from provisioned/error (partial prior attempts)
            const { data: existing } = await db_1.supabaseAdmin
                .from('quasar_integrations')
                .select('status, quasar_tenant_id')
                .eq('invify_tenant_id', tenantId)
                .maybeSingle();
            if (existing) {
                if (existing.status === 'active') {
                    throw new Error('Financial platform already activated for this tenant.');
                }
                // 'provisioned' / 'error' / 'suspended' → saga resumes using quasar_tenant_id when present
                if (existing.quasar_tenant_id) {
                    console.log(`[ActivationService] Resuming activation for ${tenantId} (status=${existing.status}, quasar=${existing.quasar_tenant_id})`);
                }
            }
            // Fetch tenant details
            const { data: tenantData } = await db_1.supabaseAdmin
                .from('tenants')
                .select('*')
                .eq('id', tenantId)
                .single();
            if (!tenantData) {
                throw new Error('Tenant not found.');
            }
            // Execute Saga
            const quasarTenantId = await this.activationSaga.execute(tenantId, tenantData, context);
            const environment = (0, quasar_tenant_key_environment_1.resolveQuasarTenantKeyEnvironment)();
            return {
                message: 'Financial Platform successfully activated.',
                status: 'ACTIVE',
                quasar_tenant_id: quasarTenantId,
                environment,
            };
        }
        finally {
            await this.lockProvider.releaseLock(tenantId);
        }
    }
}
exports.FinancialPlatformActivationService = FinancialPlatformActivationService;
//# sourceMappingURL=FinancialPlatformActivationService.js.map