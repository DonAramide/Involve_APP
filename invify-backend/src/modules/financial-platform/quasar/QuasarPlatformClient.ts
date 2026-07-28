// invify-backend/src/modules/financial-platform/quasar/QuasarPlatformClient.ts

import axios, { AxiosInstance } from 'axios';
import { CredentialProvider } from '../infrastructure/CredentialProvider';
import { ObservabilityContext } from '../domain/Types';
import { CircuitBreaker, RetryPolicy } from '../infrastructure/ResiliencePolicies';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

export class QuasarPlatformClient {
  private http: AxiosInstance;

  constructor(
    private credentialProvider: CredentialProvider,
    private circuitBreaker: CircuitBreaker,
    private retryPolicy: RetryPolicy,
    private baseUrl: string = process.env.QUASAR_BASE_URL || 'https://api-quasar.iips.app/api/v1'
  ) {
    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.http.interceptors.request.use(async (config) => {
      const creds = await this.credentialProvider.getPlatformCredentials();
      config.headers['X-Quasar-Client-Id'] = creds.clientId;
      config.headers['X-Quasar-Client-Secret'] = creds.clientSecret;
      return config;
    });
  }

  /**
   * Step A: Provisions a new tenant inside Quasar.
   * On duplicate-slug 409, recovers only from structured tenant payloads — never from
   * UUIDs embedded in the slug/error message (those are Invify IDs, not Quasar IDs).
   */
  async createTenant(
    params: { name: string; slug: string; vertical: string; defaultCurrency: string },
    context: ObservabilityContext,
    idempotencyKey: string
  ) {
    return this.circuitBreaker.execute(async () => {
      return this.retryPolicy.execute(async () => {
        try {
          const response = await this.http.post('/integration/platform/tenants', params, {
            headers: {
              'Idempotency-Key': idempotencyKey,
              'X-Correlation-Id': context.correlationId,
              'X-Request-Id': context.requestId,
              'X-Trace-Id': context.traceId
            }
          });
          return response.data;
        } catch (error: any) {
          if (error?.response?.status === 409) {
            const body = error.response.data;
            const forbiddenIds = this.slugEmbeddedUuids(params.slug);

            let recovered = this.extractExistingTenantFromConflict(body, params.slug, forbiddenIds);

            if (!recovered) {
              console.warn(
                `[QuasarPlatformClient] 409 for slug "${params.slug}" — attempting slug lookup. Body:`,
                JSON.stringify(body)
              );
              recovered = await this.findTenantBySlug(params.slug, context, forbiddenIds);
            }

            if (recovered?.id && !forbiddenIds.has(recovered.id.toLowerCase())) {
              // Verify the recovered id actually exists on Quasar before trusting it
              const verified = await this.verifyTenantExists(recovered.id, context);
              if (verified) {
                console.warn(
                  `[QuasarPlatformClient] Recovered existing Quasar tenant ${recovered.id} for slug "${params.slug}"`
                );
                return {
                  responseCode: '00',
                  responseMessage: 'Recovered existing tenant from conflict',
                  data: { data: recovered },
                  recoveredFromConflict: true
                };
              }
              console.warn(
                `[QuasarPlatformClient] Rejected recovered id ${recovered.id} — Quasar getTenant returned not found`
              );
            }

            console.error(
              '[QuasarPlatformClient] 409 conflict and could not recover a valid Quasar tenant id. Body:',
              JSON.stringify(body)
            );
          }
          throw error;
        }
      }, context);
    }, context);
  }

  async findTenantBySlug(
    slug: string,
    context: ObservabilityContext,
    forbiddenIds: Set<string> = new Set()
  ): Promise<{ id: string; slug: string; [key: string]: any } | null> {
    const headers = {
      'X-Correlation-Id': context.correlationId,
      'X-Request-Id': context.requestId,
      'X-Trace-Id': context.traceId
    };

    const attempts: Array<() => Promise<any>> = [
      () => this.http.get('/integration/platform/tenants', { params: { slug }, headers }),
      () => this.http.get(`/integration/platform/tenants/by-slug/${encodeURIComponent(slug)}`, { headers }),
      () => this.http.get(`/integration/platform/tenants/slug/${encodeURIComponent(slug)}`, { headers }),
    ];

    for (const attempt of attempts) {
      try {
        const response = await attempt();
        const parsed = this.normalizeTenantPayload(response.data, slug, forbiddenIds);
        if (parsed?.id) return parsed;
      } catch {
        // try next shape
      }
    }
    return null;
  }

  async verifyTenantExists(tenantId: string, context: ObservabilityContext): Promise<boolean> {
    try {
      await this.getTenant(tenantId, context);
      return true;
    } catch (err: any) {
      if (err?.response?.status === 404) return false;
      // Network/auth errors — don't treat as "exists"
      console.warn(`[QuasarPlatformClient] verifyTenantExists(${tenantId}) failed:`, err?.message);
      return false;
    }
  }

  /**
   * Only accept structured id fields. Never scrape UUIDs out of responseMessage
   * (slug "tenant-{invifyUuid}" embeds the Invify id and is NOT the Quasar tenant id).
   */
  private extractExistingTenantFromConflict(
    body: any,
    slug: string,
    forbiddenIds: Set<string>
  ): { id: string; slug: string; [key: string]: any } | null {
    if (!body || typeof body !== 'object') return null;

    const candidates = [
      body?.data?.data,
      body?.data,
      body?.existing,
      body?.existingTenant,
      body?.tenant,
    ];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
      const id =
        candidate.id ||
        candidate.tenantId ||
        candidate.existingTenantId ||
        candidate.tenant_id;
      if (typeof id === 'string' && UUID_RE.test(id) && !forbiddenIds.has(id.toLowerCase())) {
        return { ...candidate, id, slug: candidate.slug || slug };
      }
    }
    return null;
  }

  private normalizeTenantPayload(
    payload: any,
    slug: string,
    forbiddenIds: Set<string>
  ): { id: string; slug: string; [key: string]: any } | null {
    const list =
      payload?.data?.data?.items ||
      payload?.data?.items ||
      payload?.data?.data ||
      payload?.data ||
      payload;

    if (Array.isArray(list)) {
      const match = list.find((t: any) => t?.slug === slug) || list.find((t: any) => t?.id) || list[0];
      if (
        match?.id &&
        typeof match.id === 'string' &&
        !forbiddenIds.has(match.id.toLowerCase())
      ) {
        return { ...match, id: match.id, slug: match.slug || slug };
      }
      return null;
    }

    if (
      list &&
      typeof list === 'object' &&
      typeof list.id === 'string' &&
      !forbiddenIds.has(list.id.toLowerCase())
    ) {
      return { ...list, id: list.id, slug: list.slug || slug };
    }

    return null;
  }

  /** UUIDs that appear inside our slug (Invify tenant id) must never be used as Quasar ids. */
  private slugEmbeddedUuids(slug: string): Set<string> {
    const set = new Set<string>();
    const matches = slug.match(new RegExp(UUID_RE.source, 'gi')) || [];
    for (const m of matches) set.add(m.toLowerCase());
    return set;
  }

  async createTenantApiKey(
    tenantId: string,
    params: { name: string; environment: string },
    context: ObservabilityContext,
    idempotencyKey: string
  ) {
    return this.circuitBreaker.execute(async () => {
      return this.retryPolicy.execute(async () => {
        const response = await this.http.post(`/integration/platform/tenants/${tenantId}/api-keys`, params, {
          headers: {
            'Idempotency-Key': idempotencyKey,
            'X-Correlation-Id': context.correlationId,
            'X-Request-Id': context.requestId,
            'X-Trace-Id': context.traceId
          }
        });
        return response.data;
      }, context);
    }, context);
  }

  async getTenant(tenantId: string, context: ObservabilityContext) {
    return this.circuitBreaker.execute(async () => {
      return this.retryPolicy.execute(async () => {
        const response = await this.http.get(`/integration/platform/tenants/${tenantId}`, {
          headers: {
            'X-Correlation-Id': context.correlationId,
            'X-Request-Id': context.requestId,
            'X-Trace-Id': context.traceId
          }
        });
        return response.data;
      }, context);
    }, context);
  }
}
