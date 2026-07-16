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
  /** Platform partner credentials (for provisioning calls) */
  partnerAuth?: {
    clientId: string;
    clientSecret: string;
  };
  /** Tenant API key (for financial / runtime calls) */
  tenantApiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface RequestOptions {
  idempotencyKey?: string;
  correlationId?: string;
  /** If true, do not retry on failure */
  noRetry?: boolean;
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────────

interface CircuitBreakerState {
  failures: number;
  openedAt: number | null;
  isOpen: boolean;
}

const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_PROBE_INTERVAL_MS = 30_000;

const circuitState: CircuitBreakerState = {
  failures: 0,
  openedAt: null,
  isOpen: false,
};

function recordSuccess() {
  circuitState.failures = 0;
  circuitState.isOpen = false;
  circuitState.openedAt = null;
}

function recordFailure() {
  circuitState.failures += 1;
  if (circuitState.failures >= CIRCUIT_FAILURE_THRESHOLD && !circuitState.isOpen) {
    circuitState.isOpen = true;
    circuitState.openedAt = Date.now();
    console.error(`[QuasarApiClient] Circuit OPEN after ${circuitState.failures} consecutive failures.`);
  }
}

function isCircuitOpen(): boolean {
  if (!circuitState.isOpen) return false;
  const elapsed = Date.now() - (circuitState.openedAt ?? 0);
  if (elapsed >= CIRCUIT_PROBE_INTERVAL_MS) {
    // Half-open: allow one probe
    console.warn('[QuasarApiClient] Circuit HALF-OPEN — probing Quasar.');
    return false;
  }
  return true;
}

// ─── Retry ────────────────────────────────────────────────────────────────────

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

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
    const correlationId = opts.correlationId ?? crypto.randomUUID();
    const headers: Record<string, string> = {
      'X-Correlation-Id': correlationId,
    };

    if (opts.idempotencyKey) {
      headers['Idempotency-Key'] = opts.idempotencyKey;
    }

    if (this.options.tenantApiKey) {
      headers['Authorization'] = `Bearer ${this.options.tenantApiKey}`;
    } else if (this.options.partnerAuth) {
      headers['X-Quasar-Client-Id'] = this.options.partnerAuth.clientId;
      headers['X-Quasar-Client-Secret'] = this.options.partnerAuth.clientSecret;
    }

    return headers;
  }

  // ── QFP envelope unwrapper ────────────────────────────────────────────────

  private unwrap<T>(response: QFPResponse<T>, path: string): T {
    if (response.responseCode !== '00') {
      throw new QuasarApiError(
        response.responseMessage || 'Quasar API returned non-00 response',
        response.responseCode,
        path,
      );
    }
    return response.data as T;
  }

  // ── Core request with retry + circuit breaker ─────────────────────────────

  async request<T = any>(
    config: AxiosRequestConfig,
    reqOpts: RequestOptions = {},
  ): Promise<T> {
    const { maxRetries, noRetry } = { noRetry: reqOpts.noRetry ?? false, maxRetries: this.options.maxRetries };
    const headers = this.buildAuthHeaders(reqOpts);
    const path = `${config.method?.toUpperCase()} ${config.url}`;

    if (isCircuitOpen()) {
      throw new QuasarApiError(
        'Quasar circuit breaker is open — requests suspended. Will retry automatically.',
        'CIRCUIT_OPEN',
        path,
      );
    }

    let lastError: Error | null = null;
    const attempts = noRetry ? 1 : maxRetries;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await this.http.request<QFPResponse<T>>({
          ...config,
          headers: { ...config.headers, ...headers },
        });

        recordSuccess();

        const unwrapped = this.unwrap<T>(response.data, path);
        this.log('info', path, headers['X-Correlation-Id'], `Success (attempt ${attempt})`);
        return unwrapped;

      } catch (err: any) {
        const status = (err as AxiosError)?.response?.status ?? 0;
        const axiosData = (err as AxiosError)?.response?.data as QFPResponse | undefined;
        const message = axiosData?.responseMessage || err.message;

        this.log('error', path, headers['X-Correlation-Id'], `Error (attempt ${attempt}/${attempts}): ${message}`);

        if (status && isRetryable(status)) {
          recordFailure();
          lastError = new QuasarApiError(message, axiosData?.responseCode ?? String(status), path);
          if (attempt < attempts) {
            const delayMs = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
            this.log('warn', path, headers['X-Correlation-Id'], `Retrying in ${delayMs}ms...`);
            await sleep(delayMs);
            continue;
          }
        } else if (status >= 400 && status < 500) {
          // Client error — don't retry, don't record as Quasar failure
          throw new QuasarApiError(message, axiosData?.responseCode ?? String(status), path);
        } else {
          // Network / timeout
          recordFailure();
          lastError = err;
          if (attempt < attempts) {
            await sleep(Math.pow(2, attempt) * 500);
            continue;
          }
        }
        throw lastError ?? err;
      }
    }

    throw lastError ?? new Error(`Quasar request failed: ${path}`);
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

  private log(level: 'info' | 'warn' | 'error', path: string, correlationId: string, message: string) {
    const entry = JSON.stringify({ ts: new Date().toISOString(), level, path, correlationId, message });
    if (level === 'error') console.error(`[QuasarApiClient] ${entry}`);
    else if (level === 'warn') console.warn(`[QuasarApiClient] ${entry}`);
    else console.log(`[QuasarApiClient] ${entry}`);
  }

  /** Expose the circuit breaker state for health monitoring */
  static getCircuitState(): Readonly<CircuitBreakerState> {
    return { ...circuitState };
  }

  /**
   * Reset the circuit breaker to closed state.
   * Use in test teardown only — never call in production code.
   */
  static resetCircuit(): void {
    circuitState.failures = 0;
    circuitState.isOpen = false;
    circuitState.openedAt = null;
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
