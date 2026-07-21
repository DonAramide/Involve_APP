import { QuasarApiClient, RequestOptions } from './quasar-api.client';

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
  secret: string; // Only returned once upon creation
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
export class QuasarServiceClient {
  private readonly baseUrl: string;
  private readonly serviceId: string;
  private readonly serviceSecret: string;

  constructor(opts?: QuasarServiceClientOptions) {
    this.baseUrl = opts?.baseUrl ?? process.env.QUASAR_BASE_URL ?? 'https://api-quasar.iips.app/api/v1';
    
    const sid = opts?.serviceId ?? process.env.QUASAR_SERVICE_ID;
    const ssecret = opts?.serviceSecret ?? process.env.QUASAR_SERVICE_SECRET;

    if (!sid || !ssecret) {
      throw new Error('Missing Quasar Service credentials. Ensure QUASAR_SERVICE_ID and QUASAR_SERVICE_SECRET are set.');
    }

    this.serviceId = sid;
    this.serviceSecret = ssecret;
  }

  private buildClient(): QuasarApiClient {
    return new QuasarApiClient({
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
  async createClient(params: CreateClientParams, opts?: RequestOptions): Promise<CreateClientResult> {
    const client = this.buildClient();
    const idempotencyKey = opts?.idempotencyKey ?? `create-client:${params.slug}`;

    const raw = await client.post<{ data: CreateClientResult } | CreateClientResult>(
      '/integration/service/clients',
      params,
      { ...opts, idempotencyKey }
    );

    return (raw as any)?.data ?? raw;
  }

  /**
   * List all Clients owned by this Service.
   * GET /integration/service/clients
   */
  async listClients(opts?: RequestOptions): Promise<QuasarClientData[]> {
    const client = this.buildClient();
    const raw = await client.get<{ data: QuasarClientData[] } | QuasarClientData[]>(
      '/integration/service/clients',
      opts
    );

    return (raw as any)?.data ?? raw;
  }

  /**
   * Rotate a Client's secret credential.
   * POST /integration/service/clients/{clientId}/rotate-secret
   */
  async rotateClientSecret(clientId: string, opts?: RequestOptions): Promise<{ secret: string }> {
    const client = this.buildClient();
    const raw = await client.post<{ data: { secret: string } } | { secret: string }>(
      `/integration/service/clients/${clientId}/rotate-secret`,
      {},
      opts
    );

    return (raw as any)?.data ?? raw;
  }

  /**
   * Revoke/Disable a Client.
   * POST /integration/service/clients/{clientId}/revoke
   */
  async revokeClient(clientId: string, opts?: RequestOptions): Promise<void> {
    const client = this.buildClient();
    await client.post(
      `/integration/service/clients/${clientId}/revoke`,
      {},
      opts
    );
  }
}
