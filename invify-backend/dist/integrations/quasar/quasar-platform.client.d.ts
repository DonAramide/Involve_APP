/**
 * QuasarPlatformClient — Invify backend provisioning operations.
 *
 * Auth: Platform partner headers (X-Quasar-Client-Id + X-Quasar-Client-Secret)
 * Scope: tenant:provision, tenant:read, api_key:create
 *
 * These credentials are NEVER exposed to mobile clients or MPOS devices.
 */
import { RequestOptions } from './quasar-api.client';
export type InvifyVertical = 'invify_retail' | 'invify_school' | 'invify_services';
export interface QuasarTenant {
    id: string;
    name: string;
    slug: string;
    code: string;
    vertical: InvifyVertical;
    defaultCurrency: string;
    status: string;
}
export interface QuasarApiKeyResult {
    tenantId: string;
    publicKey: string;
    secretKey: string;
    scopes: string[];
    warning?: string;
}
export interface CreateTenantParams {
    name: string;
    slug: string;
    vertical: InvifyVertical;
    defaultCurrency?: string;
}
export interface CreateApiKeyParams {
    name: string;
    environment: 'test' | 'live';
}
export declare class QuasarPlatformClient {
    private readonly baseUrl;
    constructor();
    private buildClient;
    /**
     * Step B1 — Create a Quasar tenant for a new Invify merchant.
     * POST /integration/platform/tenants
     */
    createTenant(params: CreateTenantParams, opts?: RequestOptions): Promise<QuasarTenant>;
    /**
     * Step B2 — Issue a tenant API key (sk_*) for MPOS delivery.
     * POST /integration/platform/tenants/{tenantId}/api-keys
     */
    createApiKey(tenantId: string, vertical: InvifyVertical, params: CreateApiKeyParams, opts?: RequestOptions): Promise<QuasarApiKeyResult>;
    /**
     * Step C — Read back a provisioned tenant.
     * GET /integration/platform/tenants/{tenantId}
     */
    getTenant(tenantId: string, vertical: InvifyVertical, opts?: RequestOptions): Promise<QuasarTenant>;
    /**
     * Resolve the correct vertical from an Invify tenant type string.
     */
    static resolveVertical(type: string): InvifyVertical;
    /**
     * Generate a safe, unique tenant slug from a name + ID prefix.
     */
    static buildSlug(name: string, idPrefix: string): string;
}
export declare const quasarPlatformClient: QuasarPlatformClient;
