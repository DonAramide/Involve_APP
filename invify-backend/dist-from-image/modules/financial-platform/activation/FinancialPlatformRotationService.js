"use strict";
// invify-backend/src/modules/financial-platform/activation/FinancialPlatformRotationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialPlatformRotationService = void 0;
const db_1 = require("../../../utils/db");
const quasar_tenant_key_environment_1 = require("../../../integrations/quasar/quasar-tenant-key-environment");
class FinancialPlatformRotationService {
    lockProvider;
    rotationSaga;
    constructor(lockProvider, rotationSaga) {
        this.lockProvider = lockProvider;
        this.rotationSaga = rotationSaga;
    }
    async rotateCredentials(tenantId, context) {
        const lockAcquired = await this.lockProvider.acquireLock(tenantId, 60);
        if (!lockAcquired) {
            throw new Error(`A platform operation for tenant ${tenantId} is already in progress.`);
        }
        try {
            // Source of truth is quasar_integrations (not the unused financial_platform_connections table)
            const { data: connection } = await db_1.supabaseAdmin
                .from('quasar_integrations')
                .select('status, quasar_tenant_id')
                .eq('invify_tenant_id', tenantId)
                .maybeSingle();
            if (!connection || connection.status !== 'active') {
                throw new Error('Financial Platform must be ACTIVE before rotating credentials. Open Financial Platform and activate first.');
            }
            if (!connection.quasar_tenant_id) {
                throw new Error('Quasar tenant id missing — re-run Financial Platform activation.');
            }
            const vaultUrn = `quasarTenant/${tenantId}`;
            await this.rotationSaga.execute(tenantId, connection.quasar_tenant_id, vaultUrn, context);
            const environment = (0, quasar_tenant_key_environment_1.resolveQuasarTenantKeyEnvironment)();
            return {
                message: 'Credentials successfully rotated and verified.',
                status: 'ACTIVE',
                quasar_tenant_id: connection.quasar_tenant_id,
                environment,
            };
        }
        finally {
            await this.lockProvider.releaseLock(tenantId);
        }
    }
}
exports.FinancialPlatformRotationService = FinancialPlatformRotationService;
//# sourceMappingURL=FinancialPlatformRotationService.js.map