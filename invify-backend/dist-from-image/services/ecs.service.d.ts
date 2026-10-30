export interface EcsSaveResult {
    saved: string[];
    skipped: string[];
    failed: string[];
    verified: boolean;
    summary: string;
}
export declare class EcsService {
    private registry;
    private cache;
    /**
     * Resolves the full configuration for a given namespace and environment,
     * applying global/tenant inheritance and masking secrets.
     * Persisted in Supabase configuration_values (+ vault for secret payloads).
     */
    resolve(namespace: string, environment?: string, tenantId?: string): Promise<Record<string, any>>;
    /**
     * Validates and upserts configuration, routing secrets to Vault.
     * Non-secret fields and secret metadata persist in configuration_values.
     */
    save(namespace: string, environment: string, values: Record<string, any>, tenantId?: string): Promise<EcsSaveResult>;
    private hydrateSecretsFromVault;
    private loadDefinitionRows;
    private loadValuesMap;
    private upsertValue;
    /**
     * Ensures configuration_providers + definitions exist for a registry provider.
     * Safe to call repeatedly (ON CONFLICT style via select-then-insert).
     */
    private ensureProviderSeeded;
    private emitEvent;
}
export declare const ecsService: EcsService;
