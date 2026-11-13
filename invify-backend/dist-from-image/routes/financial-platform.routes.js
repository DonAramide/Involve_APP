"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const require_admin_mfa_middleware_1 = require("../middleware/require-admin-mfa.middleware");
const FinancialPlatformActivationController_1 = require("../modules/financial-platform/activation/FinancialPlatformActivationController");
const FinancialPlatformActivationService_1 = require("../modules/financial-platform/activation/FinancialPlatformActivationService");
const FinancialPlatformRotationController_1 = require("../modules/financial-platform/activation/FinancialPlatformRotationController");
const FinancialPlatformRotationService_1 = require("../modules/financial-platform/activation/FinancialPlatformRotationService");
const FinancialPlatformHealthController_1 = require("../modules/financial-platform/health/FinancialPlatformHealthController");
const FinancialPlatformHealthService_1 = require("../modules/financial-platform/health/FinancialPlatformHealthService");
const FinancialPlatformAuditController_1 = require("../modules/financial-platform/audit/FinancialPlatformAuditController");
const FinancialPlatformAuditService_1 = require("../modules/financial-platform/audit/FinancialPlatformAuditService");
const CredentialProvider_1 = require("../modules/financial-platform/infrastructure/CredentialProvider");
const ResiliencePolicies_1 = require("../modules/financial-platform/infrastructure/ResiliencePolicies");
const QuasarPlatformClient_1 = require("../modules/financial-platform/quasar/QuasarPlatformClient");
const ActivationSaga_1 = require("../modules/financial-platform/orchestration/ActivationSaga");
const RotationSaga_1 = require("../modules/financial-platform/orchestration/RotationSaga");
const supabase_1 = require("../db/supabase");
// Implementations of required interfaces
class InMemoryActivationLockProvider {
    locks = new Map(); // tenantId -> expiresAt ms
    async acquireLock(tenantId, ttlSeconds) {
        const now = Date.now();
        const expiresAt = this.locks.get(tenantId);
        if (expiresAt && expiresAt > now)
            return false;
        this.locks.set(tenantId, now + Math.max(ttlSeconds, 1) * 1000);
        return true;
    }
    async releaseLock(tenantId) {
        this.locks.delete(tenantId);
    }
}
const integration_vault_service_1 = require("../services/integration-vault.service");
const quasar_partner_credentials_1 = require("../integrations/quasar/quasar-partner-credentials");
/** Resolve Quasar partner credentials for a vertical (school/retail/services). */
async function resolveQuasarPlatformCreds(verticalRaw) {
    const creds = await (0, quasar_partner_credentials_1.resolveQuasarPartnerCredentials)(verticalRaw);
    if (!creds.clientSecret) {
        console.warn(`[FinancialPlatform] No Quasar client secret for vertical "${creds.vertical}". ` +
            `Promote INVIFY_*_CLIENT_SECRET in the vault or set it in env. source=${creds.source}`);
        return { clientId: creds.clientId, clientSecret: '' };
    }
    console.log(`[FinancialPlatform] Using Quasar partner ${creds.clientId} for vertical ${creds.vertical} (${creds.source})`);
    return { clientId: creds.clientId, clientSecret: creds.clientSecret };
}
const mockVaultClient = {
    async read(key) {
        if (key === 'quasarPlatform' || key.startsWith('quasarPlatform:')) {
            const vertical = key.includes(':') ? key.split(':')[1] : 'invify_retail';
            return resolveQuasarPlatformCreds(vertical);
        }
        if (key.startsWith('quasarTenant/')) {
            const tenantId = key.split('/')[1];
            const tenantServiceId = `quasarTenant:${tenantId}`;
            // Try tenant-scoped identifier first (new format), fall back to generic (legacy)
            const apiKeySecret = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'PRODUCTION', tenantId, 'apiKeySecret')
                || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'STAGING', tenantId, 'apiKeySecret')
                || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential('quasarTenant', 'PRODUCTION', tenantId, 'apiKeySecret')
                || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential('quasarTenant', 'STAGING', tenantId, 'apiKeySecret');
            if (!apiKeySecret) {
                return null;
            }
            const quasarTenantId = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'PRODUCTION', tenantId, 'quasarTenantId')
                || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'STAGING', tenantId, 'quasarTenantId')
                || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential('quasarTenant', 'PRODUCTION', tenantId, 'quasarTenantId')
                || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential('quasarTenant', 'STAGING', tenantId, 'quasarTenantId');
            return { apiKeySecret, tenantId: quasarTenantId, environment: 'PRODUCTION' };
        }
        return null;
    },
    async write(key, value) {
        // Determine target integration
        if (key === 'quasarPlatform') {
            let vault = (await integration_vault_service_1.IntegrationVaultService.listIntegrations('GLOBAL')).find(i => i.service_identifier === 'quasarPlatform');
            if (!vault) {
                vault = await integration_vault_service_1.IntegrationVaultService.registerIntegration({
                    service_identifier: 'quasarPlatform',
                    name: 'Quasar Platform Gateway',
                    category: 'PAYMENT_GATEWAY',
                    scope: 'GLOBAL'
                });
            }
            if (value.clientId) {
                await integration_vault_service_1.IntegrationVaultService.addCredential(vault.id, {
                    credential_type: 'API_KEY',
                    environment: 'PRODUCTION',
                    plaintext_value: value.clientId,
                    key_name: 'clientId',
                    rotate_existing: true
                });
            }
            if (value.clientSecret) {
                await integration_vault_service_1.IntegrationVaultService.addCredential(vault.id, {
                    credential_type: 'API_KEY',
                    environment: 'PRODUCTION',
                    plaintext_value: value.clientSecret,
                    key_name: 'clientSecret',
                    rotate_existing: true
                });
            }
        }
        else if (key.startsWith('quasarTenant/')) {
            const tenantId = key.split('/')[1];
            // Use tenant-scoped service_identifier to avoid unique constraint collision across tenants
            const tenantServiceId = `quasarTenant:${tenantId}`;
            let vault = (await integration_vault_service_1.IntegrationVaultService.listIntegrations('TENANT', tenantId)).find(i => i.service_identifier === tenantServiceId || i.service_identifier === 'quasarTenant');
            if (!vault) {
                vault = await integration_vault_service_1.IntegrationVaultService.registerIntegration({
                    service_identifier: tenantServiceId,
                    name: 'Quasar Merchant Gateway',
                    category: 'PAYMENT_GATEWAY',
                    scope: 'TENANT',
                    tenant_id: tenantId
                });
            }
            if (value.apiKeySecret) {
                await integration_vault_service_1.IntegrationVaultService.addCredential(vault.id, {
                    credential_type: 'API_KEY',
                    environment: 'PRODUCTION',
                    plaintext_value: value.apiKeySecret,
                    key_name: 'apiKeySecret',
                    rotate_existing: true
                });
            }
            if (value.tenantId) {
                await integration_vault_service_1.IntegrationVaultService.addCredential(vault.id, {
                    credential_type: 'API_KEY',
                    environment: 'PRODUCTION',
                    plaintext_value: value.tenantId,
                    key_name: 'quasarTenantId',
                    rotate_existing: true
                });
            }
            if (value.apiKeyPublic) {
                await integration_vault_service_1.IntegrationVaultService.addCredential(vault.id, {
                    credential_type: 'API_KEY',
                    environment: 'PRODUCTION',
                    plaintext_value: value.apiKeyPublic,
                    key_name: 'apiKeyPublic',
                    rotate_existing: true
                });
            }
        }
    },
    async delete(key) {
        if (key === 'quasarPlatform') {
            const vault = (await integration_vault_service_1.IntegrationVaultService.listIntegrations('GLOBAL')).find(i => i.service_identifier === 'quasarPlatform');
            if (vault) {
                // Demote or delete credentials
                const { supabaseAdmin } = require('../db/supabase');
                await supabaseAdmin.from('integration_credentials').delete().eq('vault_id', vault.id);
            }
        }
        else if (key.startsWith('quasarTenant/')) {
            const tenantId = key.split('/')[1];
            const tenantServiceId = `quasarTenant:${tenantId}`;
            const vault = (await integration_vault_service_1.IntegrationVaultService.listIntegrations('TENANT', tenantId)).find(i => i.service_identifier === tenantServiceId || i.service_identifier === 'quasarTenant');
            if (vault) {
                const { supabaseAdmin } = require('../db/supabase');
                await supabaseAdmin.from('integration_credentials').delete().eq('vault_id', vault.id);
            }
        }
    }
};
const mockAuditLogger = {
    async log(eventName, payload, context) {
        console.log(`[Audit] ${eventName}`, payload);
        try {
            const { error } = await supabase_1.supabase.from('audit_logs').insert({
                tenant_id: context.tenantId || null,
                module: 'FINANCIAL_PLATFORM',
                action: eventName,
                user_email: context.actorId || 'system',
                user_name: context.actorId || 'system',
                status: /FAIL|ERROR/i.test(eventName) ? 'FAILED' : 'SUCCESS',
                metadata: payload || {},
                target: payload?.quasarTenantId || payload?.tenantId || context.tenantId || null
            });
            if (error) {
                console.error('Failed to write audit log to database', error.message);
            }
        }
        catch (err) {
            console.error('Failed to write audit log to database', err.message);
        }
    }
};
const mockEventPublisher = {
    async publish(eventName, payload, context) {
        console.log(`[Event] ${eventName}`, payload);
    }
};
const mockMetricsExporter = {
    incrementCounter(metricName, tags) {
        console.log(`[Metric Counter] ${metricName}`, tags);
    },
    recordDuration(metricName, durationMs, tags) {
        console.log(`[Metric Duration] ${metricName} took ${durationMs}ms`, tags);
    }
};
// Wiring dependencies
const credentialProvider = new CredentialProvider_1.VaultCredentialProvider(mockVaultClient);
const circuitBreaker = new ResiliencePolicies_1.SimpleCircuitBreaker();
const retryPolicy = new ResiliencePolicies_1.ExponentialBackoffRetryPolicy();
const quasarClient = new QuasarPlatformClient_1.QuasarPlatformClient(credentialProvider, circuitBreaker, retryPolicy);
const lockProvider = new InMemoryActivationLockProvider();
const activationSaga = new ActivationSaga_1.ActivationSaga(quasarClient, mockVaultClient, mockAuditLogger, mockEventPublisher, mockMetricsExporter);
const rotationSaga = new RotationSaga_1.RotationSaga(quasarClient, mockVaultClient, mockAuditLogger, mockEventPublisher, mockMetricsExporter);
const activationService = new FinancialPlatformActivationService_1.FinancialPlatformActivationService(lockProvider, activationSaga);
const rotationService = new FinancialPlatformRotationService_1.FinancialPlatformRotationService(lockProvider, rotationSaga);
const healthService = new FinancialPlatformHealthService_1.FinancialPlatformHealthService(quasarClient, credentialProvider, circuitBreaker, mockVaultClient);
const auditService = new FinancialPlatformAuditService_1.FinancialPlatformAuditService();
const DeactivationSaga_1 = require("../modules/financial-platform/orchestration/DeactivationSaga");
const FinancialPlatformDeactivationService_1 = require("../modules/financial-platform/activation/FinancialPlatformDeactivationService");
const FinancialPlatformDeactivationController_1 = require("../modules/financial-platform/activation/FinancialPlatformDeactivationController");
const deactivationSaga = new DeactivationSaga_1.DeactivationSaga(quasarClient, mockVaultClient, mockAuditLogger, mockEventPublisher, mockMetricsExporter);
const deactivationService = new FinancialPlatformDeactivationService_1.FinancialPlatformDeactivationService(lockProvider, deactivationSaga);
const deactivationController = new FinancialPlatformDeactivationController_1.FinancialPlatformDeactivationController(deactivationService);
const FinancialPlatformChangeVerticalService_1 = require("../modules/financial-platform/activation/FinancialPlatformChangeVerticalService");
const FinancialPlatformChangeVerticalController_1 = require("../modules/financial-platform/activation/FinancialPlatformChangeVerticalController");
const changeVerticalService = new FinancialPlatformChangeVerticalService_1.FinancialPlatformChangeVerticalService(lockProvider, activationSaga, mockVaultClient, mockAuditLogger);
const changeVerticalController = new FinancialPlatformChangeVerticalController_1.FinancialPlatformChangeVerticalController(changeVerticalService);
const activationController = new FinancialPlatformActivationController_1.FinancialPlatformActivationController(activationService);
const rotationController = new FinancialPlatformRotationController_1.FinancialPlatformRotationController(rotationService);
const healthController = new FinancialPlatformHealthController_1.FinancialPlatformHealthController(healthService);
const auditController = new FinancialPlatformAuditController_1.FinancialPlatformAuditController(auditService);
const router = (0, express_1.Router)();
// Express routes
router.post('/tenants/:id/financial-platform/activate', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, require_admin_mfa_middleware_1.requireCheckerMfa, (req, res) => activationController.activate(req, res));
router.get('/tenants/:id/financial-platform/activation-gate', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, (req, res) => activationController.getGate(req, res));
router.post('/tenants/:id/financial-platform/manual-checks', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, (req, res) => activationController.recordCheck(req, res));
router.post('/tenants/:id/financial-platform/propose-activation', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, (req, res) => activationController.propose(req, res));
router.post('/tenants/:id/financial-platform/reject-activation', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, require_admin_mfa_middleware_1.requireCheckerMfa, (req, res) => activationController.reject(req, res));
router.post('/tenants/:id/financial-platform/rotate', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, (req, res) => rotationController.rotate(req, res));
router.post('/tenants/:id/financial-platform/deactivate', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, (req, res) => deactivationController.deactivate(req, res));
router.post('/tenants/:id/financial-platform/change-vertical', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, (req, res) => changeVerticalController.changeVertical(req, res));
router.get('/tenants/:id/financial-platform/health', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, (req, res) => healthController.getHealth(req, res));
router.get('/tenants/:id/financial-platform/audit', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, (req, res) => auditController.getAuditLog(req, res));
/**
 * GET /tenants/:id/financial-platform/credentials
 * Returns the NON-SECRET public key and webhook URL for the tenant.
 * The secret key is NEVER returned — only the public key (apiKeyPublic) is exposed.
 */
router.get('/tenants/:id/financial-platform/credentials', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, async (req, res) => {
    const tenantId = req.params.id;
    try {
        const tenantServiceId = `quasarTenant:${tenantId}`;
        // Read public key (safe to expose)
        const publicKey = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'PRODUCTION', tenantId, 'apiKeyPublic')
            || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'STAGING', tenantId, 'apiKeyPublic')
            || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential('quasarTenant', 'PRODUCTION', tenantId, 'apiKeyPublic')
            || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential('quasarTenant', 'STAGING', tenantId, 'apiKeyPublic')
            || null;
        // Read webhook URL from quasar_integrations table directly
        const { supabaseAdmin } = require('../db/supabase');
        const { data: integration } = await supabaseAdmin
            .from('quasar_integrations')
            .select('quasar_webhook_endpoint_id, quasar_environment, quasar_tenant_id')
            .eq('invify_tenant_id', tenantId)
            .maybeSingle();
        return res.json({
            publicKey: publicKey || null,
            webhookEndpointId: integration?.quasar_webhook_endpoint_id || null,
            environment: integration?.quasar_environment || null,
            provisioned: !!publicKey,
        });
    }
    catch (err) {
        console.error('[FinancialPlatform] /credentials fetch failed:', err.message);
        return res.status(500).json({ error: 'Failed to fetch credentials' });
    }
});
exports.default = router;
//# sourceMappingURL=financial-platform.routes.js.map