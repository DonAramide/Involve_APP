"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuasarService = void 0;
// src/integrations/quasar/factory.ts
const quasar_service_1 = require("./quasar.service");
const integration_vault_service_1 = require("../../services/integration-vault.service");
const quasar_integration_store_1 = require("./quasar-integration.store");
const build_variant_1 = require("../../config/build-variant");
function describeKey(sk) {
    if (sk.startsWith('sk_live_'))
        return 'sk_live_*';
    if (sk.startsWith('sk_test_'))
        return 'sk_test_*';
    return `other(len=${sk.length})`;
}
function webhookSecretFromEnv() {
    return process.env.QUASAR_WEBHOOK_SECRET || process.env.QUASER_WEBHOOK_SECRET || '';
}
/**
 * Fail-closed tenant credential for POST /api/admin/tenants/:id/provision-va.
 * Reuses QuasarIntegrationStore; does not copy vault/env resolution.
 */
async function getQuasarServiceFromTenantIntegration(tenantId) {
    if (!tenantId) {
        throw new Error('QUASAR_TENANT_INTEGRATION_MISSING');
    }
    const row = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(tenantId);
    if (!row?.quasar_sk_secret_enc) {
        throw new Error('QUASAR_TENANT_INTEGRATION_MISSING');
    }
    const sk = quasar_integration_store_1.QuasarIntegrationStore.decryptSkSecret(row);
    if (!sk) {
        throw new Error('QUASAR_TENANT_INTEGRATION_MISSING');
    }
    const variant = build_variant_1.BuildVariantService.getInstance();
    if (variant.isProd() && sk.startsWith('sk_test_')) {
        throw new Error('QUASAR_TEST_CREDENTIAL_FORBIDDEN_IN_PRODUCTION');
    }
    if (!variant.isProd() && sk.startsWith('sk_live_')) {
        throw new Error('QUASAR_LIVE_CREDENTIAL_FORBIDDEN_OUTSIDE_PRODUCTION');
    }
    if (!sk.startsWith('sk_test_') && !sk.startsWith('sk_live_')) {
        throw new Error('QUASAR_TENANT_INTEGRATION_INVALID_KEY');
    }
    console.log(`[Quasar Factory] tenant=${tenantId} key=${describeKey(sk)} source=quasar_integrations(${row.quasar_environment || '?'})`);
    return new quasar_service_1.QuasarService(sk, webhookSecretFromEnv());
}
/**
 * Factory function to retrieve a correctly initialized QuasarService.
 * Prefer live tenant keys for production financial / POS APIs.
 */
const getQuasarService = async (tenantId, options) => {
    if (options?.tenantIntegrationOnly) {
        return getQuasarServiceFromTenantIntegration(tenantId);
    }
    let apiKey = '';
    let source = '';
    if (tenantId) {
        // 1) Dedicated quasar_integrations row (provisioned / rotated secret)
        try {
            const row = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(tenantId);
            if (row?.quasar_sk_secret_enc) {
                const sk = quasar_integration_store_1.QuasarIntegrationStore.decryptSkSecret(row);
                if (sk) {
                    apiKey = sk;
                    source = `quasar_integrations(${row.quasar_environment || '?'})`;
                }
            }
        }
        catch (err) {
            console.warn(`[Quasar Factory] quasar_integrations read failed for ${tenantId}: ${err.message}`);
        }
        // 2) Integration Vault apiKeySecret — prefer if live and current is test
        try {
            const tenantServiceId = `quasarTenant:${tenantId}`;
            const decrypted = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'PRODUCTION', tenantId, 'apiKeySecret')
                || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(tenantServiceId, 'STAGING', tenantId, 'apiKeySecret')
                || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential('quasarTenant', 'PRODUCTION', tenantId, 'apiKeySecret')
                || await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential('quasarTenant', 'STAGING', tenantId, 'apiKeySecret');
            if (decrypted) {
                const vaultIsLive = decrypted.startsWith('sk_live_');
                const currentIsTest = !apiKey || apiKey.startsWith('sk_test_');
                if (!apiKey || (vaultIsLive && currentIsTest)) {
                    apiKey = decrypted;
                    source = 'integration_vault(apiKeySecret)';
                }
            }
        }
        catch (vaultErr) {
            console.warn(`[Quasar Factory] Failed to resolve tenant secret key from vault for tenant: ${tenantId}`, vaultErr?.message || vaultErr);
        }
    }
    if (!apiKey) {
        apiKey =
            process.env.QUASAR_API_KEY?.trim() ||
                process.env.QUASER_API_KEY?.trim() ||
                '';
        if (apiKey)
            source = 'env(QUASAR_API_KEY)';
    }
    if (!apiKey || apiKey.includes('your-quaser')) {
        console.error(`[Quasar Factory] QUASAR_API_KEY is not set. Cannot initialize QuasarService for tenant: ${tenantId}`);
        throw new Error('QUASAR_API_KEY (sk_test_* / sk_live_*) is required for Quasar integration');
    }
    console.log(`[Quasar Factory] tenant=${tenantId || 'n/a'} key=${describeKey(apiKey)} source=${source || 'unknown'}`);
    if (apiKey.startsWith('sk_test_')) {
        console.warn(`[Quasar Factory] sk_test_* cannot call Quasar /pos/* (sandbox-only). ` +
            `Issue sk_live_* via Platform Config → Issue Live API Key for this tenant.`);
    }
    return new quasar_service_1.QuasarService(apiKey, webhookSecretFromEnv());
};
exports.getQuasarService = getQuasarService;
//# sourceMappingURL=factory.js.map