"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarServiceClient = void 0;
const quasar_api_client_1 = require("./quasar-api.client");
/**
 * QuasarServiceClient — Operates in Plane 1 (Service).
 *
 * Uses QIP Service credentials (`qps_*`) to manage Quasar Clients (`qpc_*`).
 * Never used for Tenant or Financial operations.
 */
class QuasarServiceClient {
    baseUrl;
    serviceId;
    serviceSecret;
    constructor(opts) {
        const { resolveQuasarBaseUrl } = require('./quasar-base-url');
        this.baseUrl = opts?.baseUrl ?? resolveQuasarBaseUrl();
        const sid = opts?.serviceId ?? process.env.QUASAR_SERVICE_ID;
        const ssecret = opts?.serviceSecret ?? process.env.QUASAR_SERVICE_SECRET;
        if (!sid || !ssecret) {
            throw new Error('Missing Quasar Service credentials. Ensure QUASAR_SERVICE_ID and QUASAR_SERVICE_SECRET are set.');
        }
        this.serviceId = sid;
        this.serviceSecret = ssecret;
    }
    buildClient() {
        return new quasar_api_client_1.QuasarApiClient({
            baseUrl: this.baseUrl,
            serviceAuth: {
                serviceId: this.serviceId,
                serviceSecret: this.serviceSecret,
            },
        });
    }
    /**
     * Create a new Client under this Service.
     * POST /integration/service/clients
     */
    async createClient(params, opts) {
        const client = this.buildClient();
        const idempotencyKey = opts?.idempotencyKey ?? `create-client:${params.slug}`;
        const raw = await client.post('/integration/service/clients', params, { ...opts, idempotencyKey });
        return raw?.data ?? raw;
    }
    /**
     * List all Clients owned by this Service.
     * GET /integration/service/clients
     */
    async listClients(opts) {
        const client = this.buildClient();
        const raw = await client.get('/integration/service/clients', opts);
        return raw?.data ?? raw;
    }
    /**
     * Rotate a Client's secret credential.
     * POST /integration/service/clients/{clientId}/rotate-secret
     */
    async rotateClientSecret(clientId, opts) {
        const client = this.buildClient();
        const raw = await client.post(`/integration/service/clients/${clientId}/rotate-secret`, {}, opts);
        return raw?.data ?? raw;
    }
    /**
     * Revoke/Disable a Client.
     * POST /integration/service/clients/{clientId}/revoke
     */
    async revokeClient(clientId, opts) {
        const client = this.buildClient();
        await client.post(`/integration/service/clients/${clientId}/revoke`, {}, opts);
    }
}
exports.QuasarServiceClient = QuasarServiceClient;
//# sourceMappingURL=quasar-service.client.js.map