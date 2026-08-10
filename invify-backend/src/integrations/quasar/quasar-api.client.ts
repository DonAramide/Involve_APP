// src/integrations/quasar/quasar-api.client.ts
/**
 * QuasarApiClient — Shared HTTP foundation for all Quasar API calls.
 *
 * Centralizes:
 *  - Authentication injection (partner headers OR bearer sk_*)
 *  - X-Correlation-Id generation on every request
 *  - Idempotency-Key passthrough
 *  - QFP response envelope unwrapping + error normalization
 *  - Retry with exponential back-off (GET reads + idempotent mutations)
 *  - Circuit breaker (open after 5 consecutive 5xx/timeout, probe after 30s)
 *  - Structured logging with correlation context
 */

import { AxiosRequestConfig, AxiosError } from 'axios';
import * as crypto from 'crypto';
import { EnterpriseHttpClient } from '../../utils/http-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QFPResponse<T = any> {
  responseCode: string;
  responseMessage: string;
  data?: T;
}

export interface QuasarApiClientOptions {
  baseUrl: string;
  /** Service credentials (for QIP admin / client creation) */
  serviceAuth?: {
    serviceId: string;
    serviceSecret: string;
  };
  /** Platform partner credentials (for provisioning calls) */
  clientAuth?: {
    clientId: string;
    clientSecret: string;
  };
  /** Tenant API key (for financial / runtime calls) */
  tenantAuth?: {
    apiKey: string;
  };
  timeoutMs?: number;
  maxRetries?: number;
}

export interface RequestOptions {
  idempotencyKey?: string;
  correlationId?: string;
  /** If true, do not retry on failure */
  noRetry?: boolean;
  /** Per-request timeout override (ms). Card rails often need 60–90s. */
  timeoutMs?: number;
}

import { SimpleCircuitBreaker, ExponentialBackoffRetryPolicy } from '../../modules/financial-platform/infrastructure/ResiliencePolicies';

const circuitBreaker = new SimpleCircuitBreaker();
const retryPolicy = new ExponentialBackoffRetryPolicy(3);

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class QuasarApiClient {
  private readonly http: EnterpriseHttpClient;
  private readonly options: Required<Pick<QuasarApiClientOptions, 'timeoutMs' | 'maxRetries'>> &
    QuasarApiClientOptions;

  constructor(opts: QuasarApiClientOptions) {
    this.options = {
      timeoutMs: 15_000,
      maxRetries: 3,
      ...opts,
    };

    this.http = new EnterpriseHttpClient({
      baseURL: opts.baseUrl,
      timeout: this.options.timeoutMs,
      maxRetries: this.options.maxRetries,
      providerName: 'Quasar',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  // ── Auth header injection ──────────────────────────────────────────────────

  private buildAuthHeaders(opts: RequestOptions = {}): Record<string, string> {
    const activeAuths = [this.options.tenantAuth, this.options.clientAuth, this.options.serviceAuth].filter(Boolean);
    if (activeAuths.length > 1) {
      throw new Error('Multiple authentication planes detected. Only one authentication plane (service, client, or tenant) can be active per request.');
    }

    const correlationId = opts.correlationId ?? crypto.randomUUID();
    const headers: Record<string, string> = {
      'X-Correlation-Id': correlationId,
    };

    if (opts.idempotencyKey) {
      headers['Idempotency-Key'] = opts.idempotencyKey;
    }

    if (this.options.tenantAuth) {
      headers['Authorization'] = `Bearer ${this.options.tenantAuth.apiKey}`;
    } else if (this.options.clientAuth) {
      headers['X-Quasar-Client-Id'] = this.options.clientAuth.clientId;
      headers['X-Quasar-Client-Secret'] = this.options.clientAuth.clientSecret;
    } else if (this.options.serviceAuth) {
      headers['X-Quasar-Service-Id'] = this.options.serviceAuth.serviceId;
      headers['X-Quasar-Service-Secret'] = this.options.serviceAuth.serviceSecret;
    }

    return headers;
  }

  // ── QFP envelope unwrapper ────────────────────────────────────────────────

  private unwrap<T>(response: QFPResponse<T> | T, path: string): T {
    let body: any = response;

    // Standard Quasar envelope: { responseCode, responseMessage, data }
    if (body && typeof body === 'object' && typeof body.responseCode === 'string') {
      if (body.responseCode !== '00') {
        throw new QuasarApiError(
          body.responseMessage || 'Quasar API returned non-00 response',
          body.responseCode,
          path,
        );
      }
      body = body.data;
    }

    // POS controllers return `{ data: payload }`; the interceptor wraps again →
    // after envelope unwrap one nested `{ data }` may remain (see @iips/quasar-sdk unwrapPosControllerData).
    body = this.peelNestedData(body);

    return body as T;
  }

  /** Peel `{ data: … }` shells until a real payload is found (max 3). */
  private peelNestedData(body: any): any {
    let cur = body;
    for (let i = 0; i < 3; i++) {
      if (
        cur &&
        typeof cur === 'object' &&
        !Array.isArray(cur) &&
        Object.prototype.hasOwnProperty.call(cur, 'data') &&
        Object.keys(cur).length === 1
      ) {
        cur = cur.data;
        continue;
      }
      break;
    }
    return cur;
  }

  // ── Core request with retry + circuit breaker ─────────────────────────────

  async request<T = any>(
    config: AxiosRequestConfig,
    reqOpts: RequestOptions = {},
  ): Promise<T> {
    const { maxRetries, noRetry } = { noRetry: reqOpts.noRetry ?? false, maxRetries: this.options.maxRetries };
    const headers = this.buildAuthHeaders(reqOpts);
    const path = `${config.method?.toUpperCase()} ${config.url}`;
    const correlationId = headers['X-Correlation-Id'];

    const context = {
      correlationId,
      requestId: correlationId,
      traceId: correlationId,
      auditId: correlationId,
      actorId: 'system',
      tenantId: 'quasar'
    };

    const currentRetryPolicy = noRetry ? new ExponentialBackoffRetryPolicy(1) : retryPolicy;

    try {
      return await circuitBreaker.execute(async () => {
        return await currentRetryPolicy.execute(async () => {
          this.log('info', path, correlationId, `Sending request (noRetry: ${noRetry})...`);
          const response = await this.http.request<QFPResponse<T>>({
            ...config,
            headers: { ...config.headers, ...headers },
            ...(reqOpts.timeoutMs ? { timeout: reqOpts.timeoutMs } : {}),
          });

          return this.unwrap<T>(response.data, path);
        }, context);
      }, context);
    } catch (err: any) {
      const status = err?.response?.status ?? 0;
      const axiosData = err?.response?.data as QFPResponse | undefined;
      const message = axiosData?.responseMessage || err.message;
      this.log('error', path, correlationId, `Request failed: ${message}`);
      throw new QuasarApiError(message, axiosData?.responseCode ?? String(status), path);
    }
  }

  // ── Convenience methods ───────────────────────────────────────────────────

  async get<T>(url: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'GET', url }, opts);
  }

  async post<T>(url: string, data: any, opts?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'POST', url, data }, opts);
  }

  async put<T>(url: string, data: any, opts?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data }, opts);
  }

  async delete<T>(url: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'DELETE', url }, { ...opts, noRetry: true });
  }

  // ── Structured log ────────────────────────────────────────────────────────

  private getActivePlane(): string {
    if (this.options.tenantAuth) return 'tenant';
    if (this.options.clientAuth) return 'client';
    if (this.options.serviceAuth) return 'service';
    return 'none';
  }

  private log(level: 'info' | 'warn' | 'error', path: string, correlationId: string, message: string) {
    const plane = this.getActivePlane();
    const entry = JSON.stringify({ ts: new Date().toISOString(), level, plane, path, correlationId, message });
    if (level === 'error') console.error(`[QuasarApiClient] ${entry}`);
    else if (level === 'warn') console.warn(`[QuasarApiClient] ${entry}`);
    else console.log(`[QuasarApiClient] ${entry}`);
  }

  /** Expose the circuit breaker state for health monitoring */
  static getCircuitState(): any {
    const status = circuitBreaker.getStatus();
    return {
      failures: status.failureCount,
      openedAt: status.lastFailureTime ? status.lastFailureTime.getTime() : null,
      isOpen: status.state === 'OPEN',
    };
  }

  /**
   * Reset the circuit breaker to closed state.
   * Use in test teardown only — never call in production code.
   */
  static resetCircuit(): void {
    (circuitBreaker as any).failureCount = 0;
    (circuitBreaker as any).state = 'CLOSED';
    (circuitBreaker as any).lastFailureTime = null;
  }
}

// ─── Error Type ───────────────────────────────────────────────────────────────

export class QuasarApiError extends Error {
  constructor(
    message: string,
    public readonly responseCode: string,
    public readonly path: string,
  ) {
    super(message);
    this.name = 'QuasarApiError';
  }
}
