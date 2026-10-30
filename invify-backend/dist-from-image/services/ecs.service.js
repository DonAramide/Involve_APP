"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecsService = exports.EcsService = void 0;
const supabase_1 = require("../db/supabase");
const registry_1 = require("../providers/ecs/registry");
const integration_vault_service_1 = require("./integration-vault.service");
function isSecretMeta(value) {
    return !!value && typeof value === 'object' && value.configured === true;
}
function buildDisplayMask(plaintext) {
    if (plaintext && plaintext.length >= 6) {
        return plaintext.substring(0, 3) + '••••••••••••' + plaintext.substring(plaintext.length - 3);
    }
    return '••••••••••••••••••••';
}
class EcsService {
    registry = registry_1.EcsProviderRegistry.getInstance();
    cache = new Map();
    /**
     * Resolves the full configuration for a given namespace and environment,
     * applying global/tenant inheritance and masking secrets.
     * Persisted in Supabase configuration_values (+ vault for secret payloads).
     */
    async resolve(namespace, environment = 'PRODUCTION', tenantId) {
        const provider = this.registry.getProvider(namespace);
        if (!provider)
            throw new Error(`Provider ${namespace} not found`);
        const cacheKey = `${namespace}:${environment}:${tenantId || 'global'}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        await this.ensureProviderSeeded(namespace);
        const definitions = await this.loadDefinitionRows(namespace);
        const valuesByDefId = await this.loadValuesMap(definitions.map((d) => d.id), environment, tenantId);
        const resolvedConfig = {};
        for (const def of definitions) {
            if (valuesByDefId.has(def.id)) {
                resolvedConfig[def.key] = valuesByDefId.get(def.id);
            }
        }
        // Rehydrate secret masks from vault when DB row is missing after a restart/legacy mock save
        await this.hydrateSecretsFromVault(namespace, environment, tenantId, resolvedConfig, provider.getDefinitions());
        this.cache.set(cacheKey, resolvedConfig);
        return resolvedConfig;
    }
    /**
     * Validates and upserts configuration, routing secrets to Vault.
     * Non-secret fields and secret metadata persist in configuration_values.
     */
    async save(namespace, environment, values, tenantId) {
        const provider = this.registry.getProvider(namespace);
        if (!provider)
            throw new Error(`Provider ${namespace} not found`);
        const validationResult = await provider.validate(values);
        if (!validationResult.valid) {
            throw new Error(`Validation failed for ${namespace}: ${validationResult.errors?.join(', ')}`);
        }
        this.cache.clear();
        await this.ensureProviderSeeded(namespace);
        const definitions = provider.getDefinitions();
        const defRows = await this.loadDefinitionRows(namespace);
        const defIdByKey = new Map(defRows.map((d) => [d.key, d.id]));
        // Load existing without using the public cache path
        const existingConfig = {};
        const valuesByDefId = await this.loadValuesMap(defRows.map((d) => d.id), environment, tenantId);
        for (const def of defRows) {
            if (valuesByDefId.has(def.id)) {
                existingConfig[def.key] = valuesByDefId.get(def.id);
            }
        }
        await this.hydrateSecretsFromVault(namespace, environment, tenantId, existingConfig, definitions);
        const configsToSave = {};
        const secretsToVault = {};
        for (const [key, value] of Object.entries(values)) {
            const def = definitions.find((d) => d.key === key);
            if (def?.isSecretReference) {
                secretsToVault[key] = value;
                if (value && typeof value === 'string' && value.trim() !== '') {
                    configsToSave[key] = {
                        configured: true,
                        vaultReference: `vault://${namespace}/${key}`,
                        displayMask: buildDisplayMask(value),
                    };
                }
            }
            else {
                configsToSave[key] = value;
            }
        }
        const result = { saved: [], skipped: [], failed: [], verified: false, summary: '' };
        if (Object.keys(secretsToVault).length > 0) {
            let integrations = await integration_vault_service_1.IntegrationVaultService.listIntegrations(tenantId ? 'TENANT' : 'GLOBAL', tenantId);
            let vaultEntry = integrations.find((i) => i.service_identifier === namespace);
            if (!vaultEntry) {
                vaultEntry = await integration_vault_service_1.IntegrationVaultService.registerIntegration({
                    service_identifier: namespace,
                    name: namespace,
                    description: `ECS-managed integration for ${namespace}`,
                    category: 'PLATFORM',
                    scope: tenantId ? 'TENANT' : 'GLOBAL',
                    tenant_id: tenantId || null,
                });
                console.log(`[ECS] Registered new vault integration: ${namespace}`);
            }
            for (const [key, secretVal] of Object.entries(secretsToVault)) {
                if (!secretVal || typeof secretVal !== 'string' || secretVal.trim() === '') {
                    console.log(`[ECS] Skipped (empty/masked): ${key}`);
                    result.skipped.push(key);
                    // Keep prior mask metadata if present
                    if (isSecretMeta(existingConfig[key])) {
                        configsToSave[key] = existingConfig[key];
                    }
                    continue;
                }
                try {
                    await integration_vault_service_1.IntegrationVaultService.addCredential(vaultEntry.id, {
                        credential_type: 'SECRET',
                        environment,
                        plaintext_value: secretVal,
                        key_name: key,
                        rotate_existing: true,
                    });
                    const readBack = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(namespace, environment, tenantId, key);
                    if (readBack) {
                        console.log(`[ECS] ✅ Saved & verified in vault: ${key}`);
                        result.saved.push(key);
                    }
                    else {
                        console.error(`[ECS] ⚠️ Written but verification read returned null: ${key}`);
                        result.failed.push(key);
                    }
                }
                catch (err) {
                    console.error(`[ECS] ❌ Failed to save secret ${key}:`, err.message);
                    result.failed.push(key);
                }
            }
        }
        // Persist keys included in this save payload (including refreshed secret metadata)
        for (const [key, value] of Object.entries(configsToSave)) {
            const definitionId = defIdByKey.get(key);
            if (!definitionId) {
                console.warn(`[ECS] No definition row for key ${key} — skipping DB persist`);
                continue;
            }
            await this.upsertValue(definitionId, environment, tenantId, value);
        }
        this.emitEvent('CONFIGURATION_UPDATED', { namespace, environment, tenantId });
        this.cache.clear();
        result.verified = result.failed.length === 0;
        const parts = [];
        if (result.saved.length > 0)
            parts.push(`${result.saved.length} secret(s) saved & verified in vault`);
        if (result.skipped.length > 0)
            parts.push(`${result.skipped.length} skipped (unchanged masked fields)`);
        if (result.failed.length > 0)
            parts.push(`⚠️ ${result.failed.length} failed: ${result.failed.join(', ')}`);
        result.summary = parts.length > 0 ? parts.join(' · ') : 'No secret changes detected — config fields updated';
        console.log(`[ECS] Save complete [${namespace}/${environment}]: ${result.summary}`);
        return result;
    }
    async hydrateSecretsFromVault(namespace, environment, tenantId, resolvedConfig, definitions) {
        const secretKeys = definitions.filter((d) => d.isSecretReference).map((d) => d.key);
        if (secretKeys.length === 0)
            return;
        let integrations = [];
        try {
            integrations = await integration_vault_service_1.IntegrationVaultService.listIntegrations(tenantId ? 'TENANT' : 'GLOBAL', tenantId);
        }
        catch (err) {
            console.warn('[ECS] Could not list vault integrations for hydrate:', err.message);
            return;
        }
        const vaultEntry = integrations.find((i) => i.service_identifier === namespace);
        const creds = vaultEntry?.integration_credentials || [];
        for (const key of secretKeys) {
            if (isSecretMeta(resolvedConfig[key]))
                continue;
            const active = creds.find((c) => c.key_name === key && c.environment === environment && c.status === 'ACTIVE');
            if (!active)
                continue;
            // Prefer a real mask from decrypt when available; fall back to generic
            let displayMask = '••••••••••••••••••••';
            try {
                const plaintext = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(namespace, environment, tenantId, key);
                if (plaintext)
                    displayMask = buildDisplayMask(plaintext);
            }
            catch {
                /* keep generic mask */
            }
            resolvedConfig[key] = {
                configured: true,
                vaultReference: `vault://${namespace}/${key}`,
                displayMask,
            };
        }
    }
    async loadDefinitionRows(namespace) {
        const { data: provider, error: providerErr } = await supabase_1.supabaseAdmin
            .from('configuration_providers')
            .select('id')
            .eq('namespace', namespace)
            .maybeSingle();
        if (providerErr)
            throw new Error(`Failed to load ECS provider: ${providerErr.message}`);
        if (!provider)
            return [];
        const { data, error } = await supabase_1.supabaseAdmin
            .from('configuration_definitions')
            .select('id, key, is_secret_reference')
            .eq('provider_id', provider.id);
        if (error)
            throw new Error(`Failed to load ECS definitions: ${error.message}`);
        return (data || []);
    }
    async loadValuesMap(definitionIds, environment, tenantId) {
        const map = new Map();
        if (definitionIds.length === 0)
            return map;
        let query = supabase_1.supabaseAdmin
            .from('configuration_values')
            .select('definition_id, value')
            .eq('environment', environment)
            .in('definition_id', definitionIds);
        query = tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null);
        const { data, error } = await query;
        if (error)
            throw new Error(`Failed to load ECS values: ${error.message}`);
        for (const row of data || []) {
            // JSONB may already be parsed; unwrap if stored as primitive wrapper
            map.set(row.definition_id, row.value);
        }
        return map;
    }
    async upsertValue(definitionId, environment, tenantId, value) {
        // NULL tenant_id breaks UNIQUE upsert in Postgres — select then update/insert
        let find = supabase_1.supabaseAdmin
            .from('configuration_values')
            .select('id')
            .eq('definition_id', definitionId)
            .eq('environment', environment);
        find = tenantId ? find.eq('tenant_id', tenantId) : find.is('tenant_id', null);
        const { data: existing, error: findErr } = await find.maybeSingle();
        if (findErr)
            throw new Error(`Failed to lookup ECS value: ${findErr.message}`);
        if (existing?.id) {
            const { error } = await supabase_1.supabaseAdmin
                .from('configuration_values')
                .update({ value, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error)
                throw new Error(`Failed to update ECS value: ${error.message}`);
            return;
        }
        const { error } = await supabase_1.supabaseAdmin.from('configuration_values').insert({
            definition_id: definitionId,
            environment,
            tenant_id: tenantId || null,
            value,
        });
        if (error)
            throw new Error(`Failed to insert ECS value: ${error.message}`);
    }
    /**
     * Ensures configuration_providers + definitions exist for a registry provider.
     * Safe to call repeatedly (ON CONFLICT style via select-then-insert).
     */
    async ensureProviderSeeded(namespace) {
        const provider = this.registry.getProvider(namespace);
        if (!provider)
            return;
        const meta = provider.metadata();
        const { data: existing } = await supabase_1.supabaseAdmin
            .from('configuration_providers')
            .select('id')
            .eq('namespace', namespace)
            .maybeSingle();
        let providerId = existing?.id;
        if (!providerId) {
            const { data: created, error } = await supabase_1.supabaseAdmin
                .from('configuration_providers')
                .insert({
                namespace,
                display_name: meta.displayName,
                description: provider.description || null,
                supports_secrets: !!meta.supportsSecrets,
                version: meta.version || '1.0.0',
            })
                .select('id')
                .single();
            if (error)
                throw new Error(`Failed to seed ECS provider ${namespace}: ${error.message}`);
            providerId = created.id;
            console.log(`[ECS] Seeded configuration_providers row for ${namespace}`);
        }
        const defs = provider.getDefinitions();
        for (const def of defs) {
            const { data: existingDef } = await supabase_1.supabaseAdmin
                .from('configuration_definitions')
                .select('id')
                .eq('provider_id', providerId)
                .eq('key', def.key)
                .maybeSingle();
            if (existingDef)
                continue;
            const { error } = await supabase_1.supabaseAdmin.from('configuration_definitions').insert({
                provider_id: providerId,
                key: def.key,
                value_type: def.valueType,
                description: def.description || null,
                is_secret_reference: !!def.isSecretReference,
                is_required: !!def.isRequired,
                is_editable: def.isEditable !== false,
                restart_required: !!def.restartRequired,
                display_order: def.displayOrder ?? 0,
                default_value: def.defaultValue !== undefined ? def.defaultValue : null,
            });
            if (error) {
                console.warn(`[ECS] Failed to seed definition ${def.key}:`, error.message);
            }
        }
    }
    emitEvent(eventType, payload) {
        console.log(`[EVENT] ${eventType}`, payload);
    }
}
exports.EcsService = EcsService;
exports.ecsService = new EcsService();
//# sourceMappingURL=ecs.service.js.map