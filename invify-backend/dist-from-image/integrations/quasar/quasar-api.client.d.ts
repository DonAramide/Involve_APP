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
import { AxiosRequestConfig } from 'axios';
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
export declare class QuasarApiClient {
    private readonly http;
    private readonly options;
    constructor(opts: QuasarApiClientOptions);
    private buildAuthHeaders;
    private unwrap;
    /** Peel `{ data: … }` shells until a real payload is found (max 3). */
    private peelNestedData;
    request<T = any>(config: AxiosRequestConfig, reqOpts?: RequestOptions): Promise<T>;
    get<T>(url: string, opts?: RequestOptions): Promise<T>;
    post<T>(url: string, data: any, opts?: RequestOptions): Promise<T>;
    put<T>(url: string, data: any, opts?: RequestOptions): Promise<T>;
    delete<T>(url: string, opts?: RequestOptions): Promise<T>;
    private getActivePlane;
    private log;
    /** Expose the circuit breaker state for health monitoring */
    static getCircuitState(): any;
    /**
     * Reset the circuit breaker to closed state.
     * Use in test teardown only — never call in production code.
     */
    static resetCircuit(): void;
}
export declare class QuasarApiError extends Error {
    readonly responseCode: string;
    readonly path: string;
    status?: number;
    constructor(message: string, responseCode: string, path: string);
}
