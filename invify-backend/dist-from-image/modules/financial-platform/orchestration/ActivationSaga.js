"use strict";
// invify-backend/src/modules/financial-platform/orchestration/ActivationSaga.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivationSaga = void 0;
const quasar_integration_store_1 = require("../../../integrations/quasar/quasar-integration.store");
const vault_encryption_util_1 = require("../../../utils/vault-encryption.util");
const supabase_1 = require("../../../db/supabase");
const quasar_platform_client_1 = require("../../../integrations/quasar/quasar-platform.client");
const quasar_tenant_key_environment_1 = require("../../../integrations/quasar/quasar-tenant-key-environment");
class ActivationSaga {
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
    /**
     * Executes the activation workflow using the Saga pattern.
     * Idempotent across retries. Handles Quasar slug conflicts without mistaking
     * the Invify UUID (embedded in the slug) for the Quasar tenant id.
     *
     * @param options.forceNewProvision — clear any prior integration and mint a fresh Quasar tenant
     * @param options.slugSuffix — append to slug (e.g. "school") to avoid colliding with an old vertical's slug
     * @param options.preferResolvedVertical — always persist newly resolved vertical (ignore prior row)
     */
    async execute(tenantId, tenantData, context, options) {
        const startTime = Date.now();
        let quasarTenantId = null;
        let vaultUrn = null;
        const vertical = this.resolveVertical(tenantData);
        const suffix = String(options?.slugSuffix || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const slug = suffix
            ? `tenant-${tenantData.id}-${suffix}`
            : `tenant-${tenantData.id}`;
        if (options?.forceNewProvision) {
            console.log(`[ActivationSaga] forceNewProvision — clearing prior Quasar link for ${tenantId}`);
            try {
                await this.vaultClient.delete(`quasarTenant/${tenantId}`);
            }
            catch (e) {
                console.warn('[ActivationSaga] Vault clear during forceNewProvision:', e?.message);
            }
            await this.clearBogusCheckpoint(tenantId);
        }
        try {
            // Step 1: Resume from prior checkpoint — but only if Quasar still recognizes the id
            const existing = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(tenantId);
            if (existing?.quasar_tenant_id) {
                const candidate = existing.quasar_tenant_id;
                const looksLikeInvifyId = candidate.toLowerCase() === String(tenantData.id).toLowerCase() ||
                    slug.toLowerCase().includes(candidate.toLowerCase());
                if (looksLikeInvifyId) {
                    console.warn(`[ActivationSaga] Discarding bogus checkpointed id ${candidate} (matches Invify id / slug embedding)`);
                    await this.clearBogusCheckpoint(tenantId);
                }
                else {
                    const stillExists = await this.quasarClient.verifyTenantExists(candidate, context, vertical);
                    if (stillExists) {
                        quasarTenantId = candidate;
                        console.log(`[ActivationSaga] Resuming activation for ${tenantId} with Quasar tenant ${quasarTenantId}`);
                    }
                    else {
                        console.warn(`[ActivationSaga] Checkpointed Quasar id ${candidate} not found on Quasar — clearing and reprovisioning`);
                        await this.clearBogusCheckpoint(tenantId);
                    }
                }
            }
            // Step 2: Provision in Quasar (or recover / use recovery slug on conflict)
            if (!quasarTenantId) {
                const tenantPayload = await this.provisionQuasarTenant(tenantId, tenantData, slug, vertical, context);
                quasarTenantId = tenantPayload.id;
                await this.checkpointQuasarTenant(tenantId, {
                    quasarTenantId,
                    slug: tenantPayload.slug || slug,
                    code: tenantPayload.code || (tenantPayload.slug || slug).slice(0, 8).toUpperCase(),
                    vertical: tenantPayload.vertical || vertical,
                });
            }
            // Step 3: Issue API Key (PROD → sk_live_*, otherwise sk_test_*)
            const keyEnvironment = (0, quasar_tenant_key_environment_1.resolveQuasarTenantKeyEnvironment)();
            const keyScopes = (0, quasar_tenant_key_environment_1.scopesForQuasarTenantKeyEnvironment)(keyEnvironment);
            const keyIdempotency = `provision-apikey:${tenantId}:${keyEnvironment}:${quasarTenantId}`;
            console.log(`[ActivationSaga] Issuing Quasar API key environment=${keyEnvironment} for tenant=${tenantId}`);
            const apiKeyResp = await this.quasarClient.createTenantApiKey(quasarTenantId, {
                name: `Invify MPOS — ${tenantData.name}`,
                environment: keyEnvironment,
                scopes: keyScopes,
            }, context, keyIdempotency, vertical);
            const keyPayload = this.unwrapQuasarEntity(apiKeyResp);
            const secretKey = keyPayload.secretKey;
            const publicKey = keyPayload.publicKey;
            if (!secretKey) {
                throw new Error(`Quasar API key issuance returned no secretKey. Response: ${JSON.stringify(apiKeyResp)}`);
            }
            if (keyEnvironment === 'live' && !String(secretKey).startsWith('sk_live_')) {
                throw new Error(`Expected sk_live_* from Quasar (environment=live) but got prefix=${String(secretKey).slice(0, 8)}`);
            }
            // Step 4: Persist in Vault
            vaultUrn = `quasarTenant/${tenantId}`;
            await this.vaultClient.write(vaultUrn, {
                tenantId: quasarTenantId,
                apiKeySecret: secretKey,
                apiKeyPublic: publicKey,
                environment: keyEnvironment,
            });
            // Step 5: Persist Metadata
            const prior = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(tenantId);
            const verticalToPersist = options?.preferResolvedVertical
                ? vertical
                : (prior?.quasar_vertical || vertical);
            await quasar_integration_store_1.QuasarIntegrationStore.upsert({
                invifyTenantId: tenantId,
                quasarTenantId: quasarTenantId,
                quasarTenantSlug: prior?.quasar_tenant_slug || slug,
                quasarTenantCode: prior?.quasar_tenant_code || slug.slice(0, 8).toUpperCase(),
                vertical: verticalToPersist,
                publicKey: publicKey ?? null,
                secretKey,
                environment: keyEnvironment,
                status: 'active',
            });
            await this.eventPublisher.publish('FinancialPlatformActivated', { tenantId, quasarTenantId }, context);
            this.metricsExporter.incrementCounter('activation_success', { tenantId });
            this.metricsExporter.recordDuration('activation_duration_ms', Date.now() - startTime, { tenantId });
            await this.auditLogger.log('ACTIVATION_COMPLETED', { tenantId, quasarTenantId }, context);
            return quasarTenantId;
        }
        catch (error) {
            const conflictBody = error?.response?.data;
            if (error?.response?.status === 409 || error?.response?.status === 404) {
                console.error(`[ActivationSaga] Quasar ${error.response.status}. Body:`, JSON.stringify(conflictBody));
            }
            else {
                console.error('Saga failed, initiating compensation...', error);
            }
            if (vaultUrn) {
                try {
                    await this.vaultClient.delete(vaultUrn);
                    await this.auditLogger.log('COMPENSATION_VAULT_DELETED', { tenantId, vaultUrn }, context);
                }
                catch (e) {
                    console.error('Failed to rollback Vault', e);
                }
            }
            this.metricsExporter.incrementCounter('activation_failure', { tenantId });
            await this.auditLogger.log('ACTIVATION_FAILED', { tenantId, error: error.message }, context);
            try {
                await quasar_integration_store_1.QuasarIntegrationStore.updateStatus(tenantId, 'error');
            }
            catch {
                /* ignore */
            }
            if (conflictBody?.responseMessage) {
                throw new Error(conflictBody.responseMessage);
            }
            throw error;
        }
    }
    /** Map Invify tenant.type / business_mode → Quasar vertical (school|services|retail). */
    resolveVertical(tenantData) {
        const raw = String(tenantData?.type || tenantData?.business_mode || tenantData?.businessMode || 'retail')
            .trim()
            .toLowerCase();
        const vertical = quasar_platform_client_1.QuasarPlatformClient.resolveVertical(raw);
        console.log(`[ActivationSaga] Resolved Quasar vertical "${vertical}" from tenant type "${raw}" (${tenantData?.name || tenantData?.id})`);
        return vertical;
    }
    /**
     * Create Quasar tenant; on unrecoverable slug conflict, create under a unique recovery slug.
     */
    async provisionQuasarTenant(tenantId, tenantData, slug, vertical, context) {
        try {
            const quasarTenant = await this.quasarClient.createTenant({
                name: tenantData.name,
                slug,
                vertical,
                defaultCurrency: 'NGN'
            }, context, `provision-tenant:${tenantId}`);
            return this.requireTenantPayload(quasarTenant, tenantId);
        }
        catch (createErr) {
            const isConflict = createErr?.response?.status === 409 ||
                /already in use|already exists|conflict|Invalid recovered/i.test(createErr?.message || '');
            if (!isConflict)
                throw createErr;
            // Stable recovery slug so retries don't mint endless Quasar orphans
            const recoverySlug = `tenant-${String(tenantId).slice(0, 8)}-recovery`;
            console.warn(`[ActivationSaga] Slug "${slug}" already on Quasar without a usable tenant id. Creating recovery slug "${recoverySlug}".`);
            try {
                const recovered = await this.quasarClient.createTenant({
                    name: tenantData.name,
                    slug: recoverySlug,
                    vertical,
                    defaultCurrency: 'NGN'
                }, context, `provision-tenant-recovery:${tenantId}`);
                return { ...this.requireTenantPayload(recovered, tenantId), slug: recoverySlug };
            }
            catch (recoveryErr) {
                // Recovery slug may already exist from a prior partial success — verify via get if we have a known id pattern is impossible;
                // rethrow with clear message so operator can paste Quasar tenant UUID.
                if (recoveryErr?.response?.status === 409) {
                    throw new Error(`Quasar already has slug "${recoverySlug}" from a prior attempt, but Invify has no quasar_tenant_id. ` +
                        `Open Quasar admin, copy that tenant's UUID, then we can link it — or delete the Quasar tenant and retry Activate.`);
                }
                throw recoveryErr;
            }
        }
    }
    /**
     * Quasar envelopes nest inconsistently: data / data.data / data.data.data
     */
    unwrapQuasarEntity(payload) {
        let cur = payload;
        for (let i = 0; i < 6; i++) {
            if (!cur || typeof cur !== 'object')
                break;
            if (typeof cur.id === 'string' && cur.id.length > 0)
                return cur;
            if (cur.data !== undefined) {
                cur = cur.data;
                continue;
            }
            break;
        }
        return cur;
    }
    requireTenantPayload(raw, invifyTenantId) {
        const tenantPayload = this.unwrapQuasarEntity(raw);
        const id = tenantPayload?.id;
        if (!id) {
            throw new Error(`Quasar createTenant returned no id: ${JSON.stringify(raw)}`);
        }
        if (String(id).toLowerCase() === String(invifyTenantId).toLowerCase()) {
            throw Object.assign(new Error('Recovered id equals Invify tenant id — invalid'), {
                response: { status: 409, data: { responseMessage: 'Invalid recovered Quasar tenant id' } }
            });
        }
        return { ...tenantPayload, id };
    }
    async clearBogusCheckpoint(invifyTenantId) {
        const { error } = await supabase_1.supabaseAdmin
            .from('quasar_integrations')
            .delete()
            .eq('invify_tenant_id', invifyTenantId);
        if (error) {
            console.warn('[ActivationSaga] Failed to clear bogus checkpoint:', error.message);
        }
    }
    async checkpointQuasarTenant(invifyTenantId, meta) {
        // Never checkpoint the Invify UUID as if it were Quasar's
        if (meta.quasarTenantId.toLowerCase() === invifyTenantId.toLowerCase()) {
            console.warn('[ActivationSaga] Refusing to checkpoint Invify id as Quasar tenant id');
            return;
        }
        const existing = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
        if (existing?.quasar_tenant_id && existing.quasar_tenant_id !== meta.quasarTenantId) {
            // Replace stale/bogus row
            await this.clearBogusCheckpoint(invifyTenantId);
        }
        else if (existing?.quasar_tenant_id === meta.quasarTenantId) {
            return;
        }
        const placeholder = vault_encryption_util_1.VaultEncryptionUtil.encrypt(`pending:${invifyTenantId}`);
        const { error } = await supabase_1.supabaseAdmin.from('quasar_integrations').upsert({
            invify_tenant_id: invifyTenantId,
            quasar_tenant_id: meta.quasarTenantId,
            quasar_tenant_slug: meta.slug,
            quasar_tenant_code: meta.code,
            quasar_vertical: meta.vertical,
            quasar_public_key: null,
            quasar_sk_secret_enc: JSON.stringify(placeholder),
            quasar_environment: (0, quasar_tenant_key_environment_1.resolveQuasarTenantKeyEnvironment)(),
            status: 'provisioned',
            quasar_provisioned_at: new Date().toISOString(),
        }, { onConflict: 'invify_tenant_id' });
        if (error) {
            console.warn('[ActivationSaga] Failed to checkpoint Quasar tenant id:', error.message);
        }
    }
}
exports.ActivationSaga = ActivationSaga;
//# sourceMappingURL=ActivationSaga.js.map