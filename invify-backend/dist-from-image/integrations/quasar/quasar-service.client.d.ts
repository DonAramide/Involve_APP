import { RequestOptions } from './quasar-api.client';
export interface QuasarClientData {
    id: string;
    serviceId: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
}
export interface CreateClientParams {
    name: string;
    slug: string;
}
export interface CreateClientResult {
    client: QuasarClientData;
    secret: string;
}
export interface QuasarServiceClientOptions {
    baseUrl?: string;
    serviceId?: string;
    serviceSecret?: string;
}
/**
 * QuasarServiceClient — Operates in Plane 1 (Service).
 *
 * Uses QIP Service credentials (`qps_*`) to manage Quasar Clients (`qpc_*`).
 * Never used for Tenant or Financial operations.
 */
export declare class QuasarServiceClient {
    private readonly baseUrl;
    private readonly serviceId;
    private readonly serviceSecret;
    constructor(opts?: QuasarServiceClientOptions);
    private buildClient;
    /**
     * Create a new Client under this Service.
     * POST /integration/service/clients
     */
    createClient(params: CreateClientParams, opts?: RequestOptions): Promise<CreateClientResult>;
    /**
     * List all Clients owned by this Service.
     * GET /integration/service/clients
     */
    listClients(opts?: RequestOptions): Promise<QuasarClientData[]>;
    /**
     * Rotate a Client's secret credential.
     * POST /integration/service/clients/{clientId}/rotate-secret
     */
    rotateClientSecret(clientId: string, opts?: RequestOptions): Promise<{
        secret: string;
    }>;
    /**
     * Revoke/Disable a Client.
     * POST /integration/service/clients/{clientId}/revoke
     */
    revokeClient(clientId: string, opts?: RequestOptions): Promise<void>;
}
