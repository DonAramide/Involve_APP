"use strict";
// src/integrations/quasar/quasar-platform.client.ts
/**
 * QuasarPlatformClient — Invify backend provisioning operations.
 *
 * Auth: Platform partner headers (X-Quasar-Client-Id + X-Quasar-Client-Secret)
 * Scope: tenant:provision, tenant:read, api_key:create
 *
 * These credentials are NEVER exposed to mobile clients or MPOS devices.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.quasarPlatformClient = exports.QuasarPlatformClient = void 0;
const quasar_api_client_1 = require("./quasar-api.client");
// ─── Vertical → Credential Mapping ───────────────────────────────────────────
function getPartnerCredentials(vertical) {
    const credMap = {
        invify_retail: {
            envId: 'INVIFY_RETAIL_CLIENT_ID',
            envSecret: 'INVIFY_RETAIL_CLIENT_SECRET',
        },
        invify_school: {
            envId: 'INVIFY_SCHOOL_CLIENT_ID',
            envSecret: 'INVIFY_SCHOOL_CLIENT_SECRET',
        },
        invify_services: {
            envId: 'INVIFY_SERVICES_CLIENT_ID',
            envSecret: 'INVIFY_SERVICES_CLIENT_SECRET',
        },
    };
    const { envId, envSecret } = credMap[vertical];
    const clientId = process.env[envId];
    const clientSecret = process.env[envSecret];
    if (!clientId || !clientSecret) {
        throw new Error(`Missing Quasar platform credentials for vertical "${vertical}". ` +
            `Ensure ${envId} and ${envSecret} are set in environment.`);
    }
    return { clientId, clientSecret };
}
// ─── Client ───────────────────────────────────────────────────────────────────
class QuasarPlatformClient {
    baseUrl;
    constructor() {
        this.baseUrl = process.env.QUASAR_BASE_URL ?? 'https://api-quasar.iips.app/api/v1';
    }
    buildClient(vertical) {
        const creds = getPartnerCredentials(vertical);
        return new quasar_api_client_1.QuasarApiClient({
            baseUrl: this.baseUrl,
            partnerAuth: {
                clientId: creds.clientId,
                clientSecret: creds.clientSecret,
            },
        });
    }
    /**
     * Step B1 — Create a Quasar tenant for a new Invify merchant.
     * POST /integration/platform/tenants
     */
    async createTenant(params, opts) {
        const client = this.buildClient(params.vertical);
        const idempotencyKey = opts?.idempotencyKey ?? `create-tenant:${params.slug}`;
        const raw = await client.post('/integration/platform/tenants', {
            name: params.name,
            slug: params.slug,
            vertical: params.vertical,
            defaultCurrency: params.defaultCurrency ?? 'NGN',
        }, { ...opts, idempotencyKey });
        // Handle double-nested `data.data` seen in some QFP versions
        const tenant = raw?.data ?? raw;
        return tenant;
    }
    /**
     * Step B2 — Issue a tenant API key (sk_*) for MPOS delivery.
     * POST /integration/platform/tenants/{tenantId}/api-keys
     */
    async createApiKey(tenantId, vertical, params, opts) {
        const client = this.buildClient(vertical);
        const idempotencyKey = opts?.idempotencyKey ?? `create-apikey:${tenantId}:${params.environment}`;
        return client.post(`/integration/platform/tenants/${tenantId}/api-keys`, params, { ...opts, idempotencyKey });
    }
    /**
     * Step C — Read back a provisioned tenant.
     * GET /integration/platform/tenants/{tenantId}
     */
    async getTenant(tenantId, vertical, opts) {
        const client = this.buildClient(vertical);
        const raw = await client.get(`/integration/platform/tenants/${tenantId}`, opts);
        const tenant = raw?.data ?? raw;
        return tenant;
    }
    /**
     * Resolve the correct vertical from an Invify tenant type string.
     */
    static resolveVertical(type) {
        if (type === 'school')
            return 'invify_school';
        if (type === 'services')
            return 'invify_services';
        return 'invify_retail';
    }
    /**
     * Generate a safe, unique tenant slug from a name + ID prefix.
     */
    static buildSlug(name, idPrefix) {
        const base = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 30);
        return `tenant-${base}-${idPrefix}`;
    }
}
exports.QuasarPlatformClient = QuasarPlatformClient;
exports.quasarPlatformClient = new QuasarPlatformClient();
//# sourceMappingURL=quasar-platform.client.js.map