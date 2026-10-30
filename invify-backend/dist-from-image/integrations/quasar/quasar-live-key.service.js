"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarLiveKeyService = void 0;
/**
 * Issue Quasar sk_live_* for an already-provisioned Invify tenant and persist it.
 * Required for /pos/icc-data and /pos/card-transaction (sk_test_* is sandbox-only).
 */
const quasar_platform_client_1 = require("./quasar-platform.client");
const quasar_integration_store_1 = require("./quasar-integration.store");
const integration_vault_service_1 = require("../../services/integration-vault.service");
const supabase_1 = require("../../db/supabase");
const POS_LIVE_SCOPES = [
    'payments:create',
    'payments:read',
    'wallets:read',
    'transfers:create',
    'transfers:read',
    'virtual_accounts:read',
    'virtual_accounts:write',
    'webhooks:endpoints:manage',
    'webhooks:read',
    'integration:read',
    'pos:icc:write',
    'pos:card:execute',
    'financial_routing:read',
];
function keyPrefix(sk) {
    if (sk.startsWith('sk_live_'))
        return 'sk_live_*';
    if (sk.startsWith('sk_test_'))
        return 'sk_test_*';
    return 'unknown';
}
function unwrapSecret(raw) {
    let cur = raw;
    for (let i = 0; i < 4 && cur; i++) {
        if (cur.secretKey || cur.secret_key) {
            return {
                secretKey: String(cur.secretKey || cur.secret_key),
                publicKey: cur.publicKey || cur.public_key || null,
            };
        }
        if (cur.data) {
            cur = cur.data;
            continue;
        }
        break;
    }
    throw new Error(`Quasar createApiKey response missing secretKey: ${JSON.stringify(Object.keys(raw || {}))}`);
}
async function upsertVaultApiKeySecret(invifyTenantId, secretKey, operatorId) {
    const serviceIdentifier = `quasarTenant:${invifyTenantId}`;
    let vaultId = null;
    const { data: existing } = await supabase_1.supabaseAdmin
        .from('integration_vault')
        .select('id')
        .eq('service_identifier', serviceIdentifier)
        .eq('tenant_id', invifyTenantId)
        .eq('scope', 'TENANT')
        .maybeSingle();
    if (existing?.id) {
        vaultId = existing.id;
    }
    else {
        const created = await integration_vault_service_1.IntegrationVaultService.registerIntegration({
            service_identifier: serviceIdentifier,
            name: `Quasar Tenant (${invifyTenantId.slice(0, 8)})`,
            description: 'Quasar tenant API keys for payments / POS',
            category: 'PAYMENTS',
            scope: 'TENANT',
            tenant_id: invifyTenantId,
        });
        vaultId = created.id;
    }
    await integration_vault_service_1.IntegrationVaultService.addCredential(vaultId, {
        credential_type: 'API_KEY',
        environment: 'PRODUCTION',
        key_name: 'apiKeySecret',
        plaintext_value: secretKey,
        rotate_existing: true,
        operator_id: operatorId,
    });
}
class QuasarLiveKeyService {
    /**
     * Issue sk_live_* on Quasar for this Invify tenant and store it in
     * quasar_integrations + Integration Vault (apiKeySecret).
     */
    static async issueAndStore(params) {
        const invifyTenantId = String(params.invifyTenantId || '').trim();
        if (!invifyTenantId)
            throw new Error('invifyTenantId is required');
        const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
        if (!integration?.quasar_tenant_id) {
            throw new Error(`No Quasar integration for Invify tenant ${invifyTenantId}. Activate Financial Platform first.`);
        }
        const vertical = integration.quasar_vertical ||
            quasar_platform_client_1.QuasarPlatformClient.resolveVertical('school');
        const quasarTenantId = integration.quasar_tenant_id;
        console.log(`[QuasarLiveKey] Issuing sk_live_* for invify=${invifyTenantId} quasar=${quasarTenantId} vertical=${vertical}`);
        const raw = await quasar_platform_client_1.quasarPlatformClient.createApiKey(quasarTenantId, vertical, {
            name: `Invify POS live — ${invifyTenantId.slice(0, 8)}`,
            environment: 'live',
            scopes: POS_LIVE_SCOPES,
        }, {
            idempotencyKey: `issue-live-apikey:${invifyTenantId}:${Date.now()}`,
        });
        const { secretKey, publicKey } = unwrapSecret(raw);
        if (!secretKey.startsWith('sk_live_')) {
            throw new Error(`Expected sk_live_* from Quasar but got ${keyPrefix(secretKey)}. Check partner createApiKey environment=live support.`);
        }
        await quasar_integration_store_1.QuasarIntegrationStore.upsert({
            invifyTenantId,
            quasarTenantId,
            quasarTenantSlug: integration.quasar_tenant_slug,
            quasarTenantCode: integration.quasar_tenant_code,
            vertical,
            publicKey,
            secretKey,
            environment: 'live',
            status: 'active',
        });
        await upsertVaultApiKeySecret(invifyTenantId, secretKey, params.operatorId);
        return {
            invifyTenantId,
            quasarTenantId,
            environment: 'live',
            keyPrefix: 'sk_live_*',
            fingerprint: `${secretKey.slice(0, 11)}…${secretKey.slice(-4)}`,
            scopes: POS_LIVE_SCOPES,
        };
    }
    /** Safe status for UI — never returns the secret. */
    static async getStatus(invifyTenantId) {
        const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
        let keyPrefixVal = null;
        if (integration) {
            try {
                keyPrefixVal = keyPrefix(quasar_integration_store_1.QuasarIntegrationStore.decryptSkSecret(integration));
            }
            catch {
                keyPrefixVal = null;
            }
        }
        let vaultHasApiKey = false;
        try {
            const v = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(`quasarTenant:${invifyTenantId}`, 'PRODUCTION', invifyTenantId, 'apiKeySecret');
            vaultHasApiKey = Boolean(v);
            if (!keyPrefixVal && v)
                keyPrefixVal = keyPrefix(v);
        }
        catch {
            /* ignore */
        }
        return {
            configured: Boolean(integration),
            environment: integration?.quasar_environment || null,
            keyPrefix: keyPrefixVal,
            quasarTenantId: integration?.quasar_tenant_id || null,
            vaultHasApiKey,
        };
    }
}
exports.QuasarLiveKeyService = QuasarLiveKeyService;
//# sourceMappingURL=quasar-live-key.service.js.map