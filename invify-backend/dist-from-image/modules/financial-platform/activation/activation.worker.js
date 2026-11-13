"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivationWorker = void 0;
const financial_platform_audit_service_1 = require("../audit/financial-platform-audit.service");
class ActivationWorker {
    quasarClient;
    credentialService;
    configService;
    auditService;
    constructor(quasarClient, credentialService, configService, auditService) {
        this.quasarClient = quasarClient;
        this.credentialService = credentialService;
        this.configService = configService;
        this.auditService = auditService;
    }
    async processActivation(tenantId, actorId, businessName, email) {
        try {
            // 1. QuasarAdminClient.createTenant()
            const provisionResponse = await this.quasarClient.createTenant({
                businessName,
                email,
                environment: 'sandbox' // or dynamically passed
            });
            // 2. QuasarCredentialService.storeCredentials()
            const credentials = {
                apiKey: provisionResponse.apiKey,
                clientSecret: provisionResponse.clientSecret,
                webhookSigningSecret: provisionResponse.webhookSigningSecret
            };
            const credentialReferences = await this.credentialService.storeCredentials(tenantId, credentials);
            // 3. QuasarConfigurationService.register()
            await this.configService.register(tenantId, {
                baseUrl: 'https://admin-api.quasar-finance.internal',
                quasarTenantId: provisionResponse.tenantId,
                environment: 'sandbox',
                timeoutMs: 5000,
                retryPolicy: { retries: 3, backoff: 'exponential' },
                credentialReferences
            });
            // 4. QuasarAdminClient.getHealth()
            const isHealthy = await this.quasarClient.getHealth();
            if (!isHealthy) {
                throw new Error('Initial Quasar health check failed after provisioning');
            }
            // 5. AuditService.logActivation()
            await this.auditService.logActivation(tenantId, actorId, financial_platform_audit_service_1.AuditStatus.SUCCESS, {
                quasarTenantId: provisionResponse.tenantId
            });
            // NOTE: Updating the financial_platform_connections status to ACTIVE would happen here
            // via a repository or DB client.
        }
        catch (error) {
            // Audit failure
            await this.auditService.logActivation(tenantId, actorId, financial_platform_audit_service_1.AuditStatus.FAILURE, {
                error: error.message || 'Unknown provisioning error'
            });
            // NOTE: Updating the financial_platform_connections status to UNPROVISIONED (rollback) would happen here
            throw error;
        }
    }
}
exports.ActivationWorker = ActivationWorker;
//# sourceMappingURL=activation.worker.js.map