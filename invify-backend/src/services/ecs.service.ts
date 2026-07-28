import { supabaseAdmin } from '../db/supabase';
import { EcsProviderRegistry } from '../providers/ecs/registry';
import { IntegrationVaultService } from './integration-vault.service';

export interface EcsSaveResult {
  saved: string[];
  skipped: string[];
  failed: string[];
  verified: boolean;
  summary: string;
}

type SecretMeta = {
  configured: true;
  vaultReference: string;
  displayMask: string;
};

function isSecretMeta(value: unknown): value is SecretMeta {
  return !!value && typeof value === 'object' && (value as any).configured === true;
}

function buildDisplayMask(plaintext: string): string {
  if (plaintext && plaintext.length >= 6) {
    return plaintext.substring(0, 3) + '••••••••••••' + plaintext.substring(plaintext.length - 3);
  }
  return '••••••••••••••••••••';
}

export class EcsService {
  private registry = EcsProviderRegistry.getInstance();
  private cache: Map<string, any> = new Map();

  /**
   * Resolves the full configuration for a given namespace and environment,
   * applying global/tenant inheritance and masking secrets.
   * Persisted in Supabase configuration_values (+ vault for secret payloads).
   */
  async resolve(namespace: string, environment: string = 'PRODUCTION', tenantId?: string): Promise<Record<string, any>> {
    const provider = this.registry.getProvider(namespace);
    if (!provider) throw new Error(`Provider ${namespace} not found`);

    const cacheKey = `${namespace}:${environment}:${tenantId || 'global'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    await this.ensureProviderSeeded(namespace);

    const definitions = await this.loadDefinitionRows(namespace);
    const valuesByDefId = await this.loadValuesMap(
      definitions.map((d) => d.id),
      environment,
      tenantId
    );

    const resolvedConfig: Record<string, any> = {};
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
  async save(namespace: string, environment: string, values: Record<string, any>, tenantId?: string): Promise<EcsSaveResult> {
    const provider = this.registry.getProvider(namespace);
    if (!provider) throw new Error(`Provider ${namespace} not found`);

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
    const existingConfig: Record<string, any> = {};
    const valuesByDefId = await this.loadValuesMap(
      defRows.map((d) => d.id),
      environment,
      tenantId
    );
    for (const def of defRows) {
      if (valuesByDefId.has(def.id)) {
        existingConfig[def.key] = valuesByDefId.get(def.id);
      }
    }
    await this.hydrateSecretsFromVault(namespace, environment, tenantId, existingConfig, definitions);

    const configsToSave: Record<string, any> = {};
    const secretsToVault: Record<string, string> = {};

    for (const [key, value] of Object.entries(values)) {
      const def = definitions.find((d) => d.key === key);
      if (def?.isSecretReference) {
        secretsToVault[key] = value as string;
        if (value && typeof value === 'string' && value.trim() !== '') {
          configsToSave[key] = {
            configured: true,
            vaultReference: `vault://${namespace}/${key}`,
            displayMask: buildDisplayMask(value),
          } satisfies SecretMeta;
        }
      } else {
        configsToSave[key] = value;
      }
    }

    const result: EcsSaveResult = { saved: [], skipped: [], failed: [], verified: false, summary: '' };

    if (Object.keys(secretsToVault).length > 0) {
      let integrations = await IntegrationVaultService.listIntegrations(tenantId ? 'TENANT' : 'GLOBAL', tenantId);
      let vaultEntry = integrations.find((i: any) => i.service_identifier === namespace);

      if (!vaultEntry) {
        vaultEntry = await IntegrationVaultService.registerIntegration({
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
          await IntegrationVaultService.addCredential(vaultEntry.id, {
            credential_type: 'SECRET',
            environment,
            plaintext_value: secretVal,
            key_name: key,
            rotate_existing: true,
          });

          const readBack = await IntegrationVaultService.getDecryptedCredential(
            namespace,
            environment,
            tenantId,
            key
          );

          if (readBack) {
            console.log(`[ECS] ✅ Saved & verified in vault: ${key}`);
            result.saved.push(key);
          } else {
            console.error(`[ECS] ⚠️ Written but verification read returned null: ${key}`);
            result.failed.push(key);
          }
        } catch (err: any) {
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
    const parts: string[] = [];
    if (result.saved.length > 0) parts.push(`${result.saved.length} secret(s) saved & verified in vault`);
    if (result.skipped.length > 0) parts.push(`${result.skipped.length} skipped (unchanged masked fields)`);
    if (result.failed.length > 0) parts.push(`⚠️ ${result.failed.length} failed: ${result.failed.join(', ')}`);
    result.summary = parts.length > 0 ? parts.join(' · ') : 'No secret changes detected — config fields updated';

    console.log(`[ECS] Save complete [${namespace}/${environment}]: ${result.summary}`);
    return result;
  }

  private async hydrateSecretsFromVault(
    namespace: string,
    environment: string,
    tenantId: string | undefined,
    resolvedConfig: Record<string, any>,
    definitions: { key: string; isSecretReference: boolean }[]
  ) {
    const secretKeys = definitions.filter((d) => d.isSecretReference).map((d) => d.key);
    if (secretKeys.length === 0) return;

    let integrations: any[] = [];
    try {
      integrations = await IntegrationVaultService.listIntegrations(tenantId ? 'TENANT' : 'GLOBAL', tenantId);
    } catch (err: any) {
      console.warn('[ECS] Could not list vault integrations for hydrate:', err.message);
      return;
    }

    const vaultEntry = integrations.find((i: any) => i.service_identifier === namespace);
    const creds: any[] = vaultEntry?.integration_credentials || [];

    for (const key of secretKeys) {
      if (isSecretMeta(resolvedConfig[key])) continue;

      const active = creds.find(
        (c) => c.key_name === key && c.environment === environment && c.status === 'ACTIVE'
      );
      if (!active) continue;

      // Prefer a real mask from decrypt when available; fall back to generic
      let displayMask = '••••••••••••••••••••';
      try {
        const plaintext = await IntegrationVaultService.getDecryptedCredential(
          namespace,
          environment,
          tenantId,
          key
        );
        if (plaintext) displayMask = buildDisplayMask(plaintext);
      } catch {
        /* keep generic mask */
      }

      resolvedConfig[key] = {
        configured: true,
        vaultReference: `vault://${namespace}/${key}`,
        displayMask,
      } satisfies SecretMeta;
    }
  }

  private async loadDefinitionRows(namespace: string): Promise<{ id: string; key: string; is_secret_reference: boolean }[]> {
    const { data: provider, error: providerErr } = await supabaseAdmin
      .from('configuration_providers')
      .select('id')
      .eq('namespace', namespace)
      .maybeSingle();

    if (providerErr) throw new Error(`Failed to load ECS provider: ${providerErr.message}`);
    if (!provider) return [];

    const { data, error } = await supabaseAdmin
      .from('configuration_definitions')
      .select('id, key, is_secret_reference')
      .eq('provider_id', provider.id);

    if (error) throw new Error(`Failed to load ECS definitions: ${error.message}`);
    return (data || []) as any[];
  }

  private async loadValuesMap(
    definitionIds: string[],
    environment: string,
    tenantId?: string
  ): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    if (definitionIds.length === 0) return map;

    let query = supabaseAdmin
      .from('configuration_values')
      .select('definition_id, value')
      .eq('environment', environment)
      .in('definition_id', definitionIds);

    query = tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to load ECS values: ${error.message}`);

    for (const row of data || []) {
      // JSONB may already be parsed; unwrap if stored as primitive wrapper
      map.set(row.definition_id, row.value);
    }
    return map;
  }

  private async upsertValue(
    definitionId: string,
    environment: string,
    tenantId: string | undefined,
    value: any
  ) {
    // NULL tenant_id breaks UNIQUE upsert in Postgres — select then update/insert
    let find = supabaseAdmin
      .from('configuration_values')
      .select('id')
      .eq('definition_id', definitionId)
      .eq('environment', environment);

    find = tenantId ? find.eq('tenant_id', tenantId) : find.is('tenant_id', null);

    const { data: existing, error: findErr } = await find.maybeSingle();
    if (findErr) throw new Error(`Failed to lookup ECS value: ${findErr.message}`);

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from('configuration_values')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw new Error(`Failed to update ECS value: ${error.message}`);
      return;
    }

    const { error } = await supabaseAdmin.from('configuration_values').insert({
      definition_id: definitionId,
      environment,
      tenant_id: tenantId || null,
      value,
    });
    if (error) throw new Error(`Failed to insert ECS value: ${error.message}`);
  }

  /**
   * Ensures configuration_providers + definitions exist for a registry provider.
   * Safe to call repeatedly (ON CONFLICT style via select-then-insert).
   */
  private async ensureProviderSeeded(namespace: string) {
    const provider = this.registry.getProvider(namespace);
    if (!provider) return;

    const meta = provider.metadata();
    const { data: existing } = await supabaseAdmin
      .from('configuration_providers')
      .select('id')
      .eq('namespace', namespace)
      .maybeSingle();

    let providerId = existing?.id as string | undefined;

    if (!providerId) {
      const { data: created, error } = await supabaseAdmin
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

      if (error) throw new Error(`Failed to seed ECS provider ${namespace}: ${error.message}`);
      providerId = created.id;
      console.log(`[ECS] Seeded configuration_providers row for ${namespace}`);
    }

    const defs = provider.getDefinitions();
    for (const def of defs) {
      const { data: existingDef } = await supabaseAdmin
        .from('configuration_definitions')
        .select('id')
        .eq('provider_id', providerId)
        .eq('key', def.key)
        .maybeSingle();

      if (existingDef) continue;

      const { error } = await supabaseAdmin.from('configuration_definitions').insert({
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

  private emitEvent(eventType: string, payload: any) {
    console.log(`[EVENT] ${eventType}`, payload);
  }
}

export const ecsService = new EcsService();
