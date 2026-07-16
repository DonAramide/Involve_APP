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
interface CircuitBreakerState {
    failures: number;
    openedAt: number | null;
    isOpen: boolean;
}
export declare class QuasarApiClient {
    private readonly http;
    private readonly options;
    constructor(opts: QuasarApiClientOptions);
    private buildAuthHeaders;
    private unwrap;
    request<T = any>(config: AxiosRequestConfig, reqOpts?: RequestOptions): Promise<T>;
    get<T>(url: string, opts?: RequestOptions): Promise<T>;
    post<T>(url: string, data: any, opts?: RequestOptions): Promise<T>;
    put<T>(url: string, data: any, opts?: RequestOptions): Promise<T>;
    delete<T>(url: string, opts?: RequestOptions): Promise<T>;
    private log;
    /** Expose the circuit breaker state for health monitoring */
    static getCircuitState(): Readonly<CircuitBreakerState>;
    /**
     * Reset the circuit breaker to closed state.
     * Use in test teardown only — never call in production code.
     */
    static resetCircuit(): void;
}
export declare class QuasarApiError extends Error {
    readonly responseCode: string;
    readonly path: string;
    constructor(message: string, responseCode: string, path: string);
}
export {};
