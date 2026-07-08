// src/integrations/quasar/quasar-platform.client.ts
/**
 * QuasarPlatformClient — Invify backend provisioning operations.
 *
 * Auth: Platform partner headers (X-Quasar-Client-Id + X-Quasar-Client-Secret)
 * Scope: tenant:provision, tenant:read, api_key:create
 *
 * These credentials are NEVER exposed to mobile clients or MPOS devices.
 */

import * as crypto from 'crypto';
import { QuasarApiClient, RequestOptions } from './quasar-api.client';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Vertical → Credential Mapping ───────────────────────────────────────────

function getPartnerCredentials(vertical: InvifyVertical): { clientId: string; clientSecret: string } {
  const credMap: Record<InvifyVertical, { envId: string; envSecret: string }> = {
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
    throw new Error(
      `Missing Quasar platform credentials for vertical "${vertical}". ` +
      `Ensure ${envId} and ${envSecret} are set in environment.`,
    );
  }

  return { clientId, clientSecret };
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class QuasarPlatformClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.QUASAR_BASE_URL ?? 'https://api-quasar.iips.app/api/v1';
  }

  private buildClient(vertical: InvifyVertical): QuasarApiClient {
    const creds = getPartnerCredentials(vertical);
    return new QuasarApiClient({
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
  async createTenant(
    params: CreateTenantParams,
    opts?: RequestOptions,
  ): Promise<QuasarTenant> {
    const client = this.buildClient(params.vertical);
    const idempotencyKey = opts?.idempotencyKey ?? `create-tenant:${params.slug}`;

    const raw = await client.post<{ data: QuasarTenant } | QuasarTenant>(
      '/integration/platform/tenants',
      {
        name: params.name,
        slug: params.slug,
        vertical: params.vertical,
        defaultCurrency: params.defaultCurrency ?? 'NGN',
      },
      { ...opts, idempotencyKey },
    );

    // Handle double-nested `data.data` seen in some QFP versions
    const tenant: QuasarTenant = (raw as any)?.data ?? raw;
    return tenant;
  }

  /**
   * Step B2 — Issue a tenant API key (sk_*) for MPOS delivery.
   * POST /integration/platform/tenants/{tenantId}/api-keys
   */
  async createApiKey(
    tenantId: string,
    vertical: InvifyVertical,
    params: CreateApiKeyParams,
    opts?: RequestOptions,
  ): Promise<QuasarApiKeyResult> {
    const client = this.buildClient(vertical);
    const idempotencyKey = opts?.idempotencyKey ?? `create-apikey:${tenantId}:${params.environment}`;

    return client.post<QuasarApiKeyResult>(
      `/integration/platform/tenants/${tenantId}/api-keys`,
      params,
      { ...opts, idempotencyKey },
    );
  }

  /**
   * Step C — Read back a provisioned tenant.
   * GET /integration/platform/tenants/{tenantId}
   */
  async getTenant(
    tenantId: string,
    vertical: InvifyVertical,
    opts?: RequestOptions,
  ): Promise<QuasarTenant> {
    const client = this.buildClient(vertical);
    const raw = await client.get<{ data: QuasarTenant } | QuasarTenant>(
      `/integration/platform/tenants/${tenantId}`,
      opts,
    );
    const tenant: QuasarTenant = (raw as any)?.data ?? raw;
    return tenant;
  }

  /**
   * Resolve the correct vertical from an Invify tenant type string.
   */
  static resolveVertical(type: string): InvifyVertical {
    if (type === 'school') return 'invify_school';
    if (type === 'services') return 'invify_services';
    return 'invify_retail';
  }

  /**
   * Generate a safe, unique tenant slug from a name + ID prefix.
   */
  static buildSlug(name: string, idPrefix: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
    return `tenant-${base}-${idPrefix}`;
  }
}

export const quasarPlatformClient = new QuasarPlatformClient();
