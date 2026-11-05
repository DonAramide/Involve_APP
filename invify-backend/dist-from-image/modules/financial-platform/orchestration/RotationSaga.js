"use strict";
// invify-backend/src/modules/financial-platform/orchestration/RotationSaga.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.RotationSaga = void 0;
const quasar_integration_store_1 = require("../../../integrations/quasar/quasar-integration.store");
const vault_encryption_util_1 = require("../../../utils/vault-encryption.util");
const supabase_1 = require("../../../db/supabase");
const quasar_tenant_key_environment_1 = require("../../../integrations/quasar/quasar-tenant-key-environment");
class RotationSaga {
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
    async execute(tenantId, quasarTenantId, vaultUrn, context) {
        const startTime = Date.now();
        const keyEnvironment = (0, quasar_tenant_key_environment_1.resolveQuasarTenantKeyEnvironment)();
        const keyScopes = (0, quasar_tenant_key_environment_1.scopesForQuasarTenantKeyEnvironment)(keyEnvironment);
        const existing = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(tenantId);
        const vertical = String(existing?.quasar_vertical || 'invify_retail');
        try {
            await quasar_integration_store_1.QuasarIntegrationStore.updateStatus(tenantId, 'provisioned');
            const keyIdempotency = `rotate-apikey:${tenantId}:${keyEnvironment}:${Date.now()}`;
            console.log(`[RotationSaga] Issuing Quasar API key environment=${keyEnvironment} vertical=${vertical} for tenant=${tenantId}`);
            const apiKeyResp = await this.quasarClient.createTenantApiKey(quasarTenantId, {
                name: `Invify MPOS Rotated — ${new Date().toISOString()}`,
                environment: keyEnvironment,
                scopes: keyScopes,
            }, context, keyIdempotency, vertical);
            const keyPayload = apiKeyResp.data?.data || apiKeyResp.data || apiKeyResp;
            const newKeySecret = keyPayload.secretKey;
            const newKeyPublic = keyPayload.publicKey;
            if (!newKeySecret) {
                throw new Error(`Quasar rotation returned no secretKey: ${JSON.stringify(apiKeyResp)}`);
            }
            if (keyEnvironment === 'live' && !String(newKeySecret).startsWith('sk_live_')) {
                throw new Error(`Expected sk_live_* from Quasar (environment=live) but got prefix=${String(newKeySecret).slice(0, 8)}`);
            }
            const isVerified = await this.verifyKey(newKeySecret);
            if (!isVerified) {
                throw new Error('New credential failed verification check. Aborting rotation.');
            }
            await this.vaultClient.write(vaultUrn, {
                tenantId: quasarTenantId,
                apiKeySecret: newKeySecret,
                apiKeyPublic: newKeyPublic,
                environment: keyEnvironment,
            });
            const encryptedSk = vault_encryption_util_1.VaultEncryptionUtil.encrypt(newKeySecret);
            const { error } = await supabase_1.supabaseAdmin
                .from('quasar_integrations')
                .update({
                quasar_sk_secret_enc: JSON.stringify(encryptedSk),
                quasar_public_key: newKeyPublic ?? null,
                quasar_environment: keyEnvironment,
                status: 'active',
                updated_at: new Date().toISOString()
            })
                .eq('invify_tenant_id', tenantId);
            if (error) {
                throw new Error(`Failed to persist rotated secret: ${error.message}`);
            }
            await this.eventPublisher.publish('FinancialPlatformCredentialsRotated', {
                tenantId,
                quasarTenantId,
                environment: keyEnvironment,
            }, context);
            await this.auditLogger.log('CREDENTIAL_ROTATION_COMPLETED', { tenantId, environment: keyEnvironment }, context);
            this.metricsExporter.incrementCounter('rotation_success', { tenantId });
            this.metricsExporter.recordDuration('rotation_duration_ms', Date.now() - startTime, { tenantId });
        }
        catch (error) {
            console.error('Rotation failed, aborting...', error);
            try {
                await quasar_integration_store_1.QuasarIntegrationStore.updateStatus(tenantId, 'active');
            }
            catch {
                /* ignore */
            }
            this.metricsExporter.incrementCounter('rotation_failure', { tenantId });
            await this.auditLogger.log('CREDENTIAL_ROTATION_FAILED', { tenantId, error: error.message }, context);
            throw error;
        }
    }
    async verifyKey(_secretKey) {
        return true;
    }
}
exports.RotationSaga = RotationSaga;
//# sourceMappingURL=RotationSaga.js.map