"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeactivationSaga = void 0;
const db_1 = require("../../../utils/db");
class DeactivationSaga {
    quasarClient;
    vaultClient;
    auditLogger;
    eventPublisher;
    metricsExporter;
    constructor(quasarClient, vaultClient, auditLogger, eventPublisher, metricsExporter) {
        this.quasarClient = quasarClient;
        this.vaultClient = vaultClient;
        this.auditLogger = auditLogger;
        this.eventPublisher = eventPublisher;
        this.metricsExporter = metricsExporter;
    }
    async execute(tenantId, quasarTenantId, vaultUrn, reason, context) {
        const startTime = Date.now();
        try {
            // Step 1: Transition to SUSPENDING
            await this.updateState(tenantId, 'SUSPENDING');
            // Step 2: Invalidate/Delete Quasar Credentials in Vault
            await this.vaultClient.delete(vaultUrn);
            // Step 3: Transition to SUSPENDED
            await db_1.supabaseAdmin.from('quasar_integrations').update({
                status: 'suspended',
                updated_at: new Date().toISOString()
            }).eq('invify_tenant_id', tenantId);
            // Step 4: Emit Lifecycle events and logs
            await this.eventPublisher.publish('FinancialPlatformDeactivated', { tenantId, quasarTenantId, reason }, context);
            await this.auditLogger.log('DEACTIVATION_COMPLETED', { tenantId, quasarTenantId, reason }, context);
            this.metricsExporter.incrementCounter('deactivation_success', { tenantId });
            this.metricsExporter.recordDuration('deactivation_duration_ms', Date.now() - startTime, { tenantId });
        }
        catch (error) {
            console.error('Deactivation Saga failed:', error);
            await this.updateState(tenantId, 'FAILED');
            this.metricsExporter.incrementCounter('deactivation_failure', { tenantId });
            await this.auditLogger.log('DEACTIVATION_FAILED', { tenantId, error: error.message }, context);
            throw error;
        }
    }
    async updateState(tenantId, status) {
        const dbStatus = status.toLowerCase() === 'failed' ? 'error' : 'suspended';
        await db_1.supabaseAdmin.from('quasar_integrations').update({
            status: dbStatus,
            updated_at: new Date().toISOString()
        }).eq('invify_tenant_id', tenantId);
    }
}
exports.DeactivationSaga = DeactivationSaga;
//# sourceMappingURL=DeactivationSaga.js.map