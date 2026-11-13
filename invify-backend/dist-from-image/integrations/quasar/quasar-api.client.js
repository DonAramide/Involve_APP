"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarApiError = exports.QuasarApiClient = void 0;
const crypto = __importStar(require("crypto"));
const http_client_1 = require("../../utils/http-client");
const ResiliencePolicies_1 = require("../../modules/financial-platform/infrastructure/ResiliencePolicies");
const circuitBreaker = new ResiliencePolicies_1.SimpleCircuitBreaker();
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// ─── Client ───────────────────────────────────────────────────────────────────
class QuasarApiClient {
    http;
    options;
    constructor(opts) {
        this.options = {
            timeoutMs: 15_000,
            maxRetries: 3,
            ...opts,
        };
        this.http = new http_client_1.EnterpriseHttpClient({
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
    buildAuthHeaders(opts = {}) {
        const activeAuths = [this.options.tenantAuth, this.options.clientAuth, this.options.serviceAuth].filter(Boolean);
        if (activeAuths.length > 1) {
            throw new Error('Multiple authentication planes detected. Only one authentication plane (service, client, or tenant) can be active per request.');
        }
        const correlationId = opts.correlationId ?? crypto.randomUUID();
        const headers = {
            'X-Correlation-Id': correlationId,
        };
        if (opts.idempotencyKey) {
            headers['Idempotency-Key'] = opts.idempotencyKey;
        }
        if (this.options.tenantAuth) {
            headers['Authorization'] = `Bearer ${this.options.tenantAuth.apiKey}`;
        }
        else if (this.options.clientAuth) {
            headers['X-Quasar-Client-Id'] = this.options.clientAuth.clientId;
            headers['X-Quasar-Client-Secret'] = this.options.clientAuth.clientSecret;
        }
        else if (this.options.serviceAuth) {
            headers['X-Quasar-Service-Id'] = this.options.serviceAuth.serviceId;
            headers['X-Quasar-Service-Secret'] = this.options.serviceAuth.serviceSecret;
        }
        return headers;
    }
    // ── QFP envelope unwrapper ────────────────────────────────────────────────
    unwrap(response, path) {
        let body = response;
        // Standard Quasar envelope: { responseCode, responseMessage, data }
        if (body && typeof body === 'object' && typeof body.responseCode === 'string') {
            if (body.responseCode !== '00') {
                throw new QuasarApiError(body.responseMessage || 'Quasar API returned non-00 response', body.responseCode, path);
            }
            body = body.data;
        }
        // POS controllers return `{ data: payload }`; the interceptor wraps again →
        // after envelope unwrap one nested `{ data }` may remain (see @iips/quasar-sdk unwrapPosControllerData).
        body = this.peelNestedData(body);
        return body;
    }
    /** Peel `{ data: … }` shells until a real payload is found (max 3). */
    peelNestedData(body) {
        let cur = body;
        for (let i = 0; i < 3; i++) {
            if (cur &&
                typeof cur === 'object' &&
                !Array.isArray(cur) &&
                Object.prototype.hasOwnProperty.call(cur, 'data') &&
                Object.keys(cur).length === 1) {
                cur = cur.data;
                continue;
            }
            break;
        }
        return cur;
    }
    // ── Core request with retry + circuit breaker ─────────────────────────────
    async request(config, reqOpts = {}) {
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
        const currentRetryPolicy = new ResiliencePolicies_1.ExponentialBackoffRetryPolicy(noRetry ? 1 : Math.max(1, maxRetries));
        try {
            return await circuitBreaker.execute(async () => {
                return await currentRetryPolicy.execute(async () => {
                    this.log('info', path, correlationId, `Sending request (noRetry: ${noRetry})...`);
                    const response = await this.http.request({
                        ...config,
                        headers: { ...config.headers, ...headers },
                        maxRetries: noRetry ? 0 : this.options.maxRetries,
                        ...(reqOpts.timeoutMs ? { timeout: reqOpts.timeoutMs } : {}),
                    });
                    return this.unwrap(response.data, path);
                }, context);
            }, context);
        }
        catch (err) {
            if (err instanceof QuasarApiError) {
                throw err;
            }
            const status = err?.response?.status ?? 0;
            const axiosData = err?.response?.data;
            const message = axiosData?.responseMessage || err.message;
            const body = axiosData && typeof axiosData === 'object'
                ? JSON.stringify(axiosData).replace(/"(signingSecret|secret|apiKey)"\s*:\s*"[^"]*"/gi, '"$1":"[redacted]"').slice(0, 240)
                : '';
            this.log('error', path, correlationId, `Request failed: ${message}${body ? ` body=${body}` : ''}`);
            const apiError = new QuasarApiError(message, axiosData?.responseCode ?? String(status), path);
            if (status >= 400)
                apiError.status = status;
            throw apiError;
        }
    }
    // ── Convenience methods ───────────────────────────────────────────────────
    async get(url, opts) {
        return this.request({ method: 'GET', url }, opts);
    }
    async post(url, data, opts) {
        return this.request({ method: 'POST', url, data }, opts);
    }
    async put(url, data, opts) {
        return this.request({ method: 'PUT', url, data }, opts);
    }
    async delete(url, opts) {
        return this.request({ method: 'DELETE', url }, { ...opts, noRetry: true });
    }
    // ── Structured log ────────────────────────────────────────────────────────
    getActivePlane() {
        if (this.options.tenantAuth)
            return 'tenant';
        if (this.options.clientAuth)
            return 'client';
        if (this.options.serviceAuth)
            return 'service';
        return 'none';
    }
    log(level, path, correlationId, message) {
        const plane = this.getActivePlane();
        const entry = JSON.stringify({ ts: new Date().toISOString(), level, plane, path, correlationId, message });
        if (level === 'error')
            console.error(`[QuasarApiClient] ${entry}`);
        else if (level === 'warn')
            console.warn(`[QuasarApiClient] ${entry}`);
        else
            console.log(`[QuasarApiClient] ${entry}`);
    }
    /** Expose the circuit breaker state for health monitoring */
    static getCircuitState() {
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
    static resetCircuit() {
        circuitBreaker.failureCount = 0;
        circuitBreaker.state = 'CLOSED';
        circuitBreaker.lastFailureTime = null;
    }
}
exports.QuasarApiClient = QuasarApiClient;
// ─── Error Type ───────────────────────────────────────────────────────────────
class QuasarApiError extends Error {
    responseCode;
    path;
    status;
    constructor(message, responseCode, path) {
        super(message);
        this.responseCode = responseCode;
        this.path = path;
        this.name = 'QuasarApiError';
    }
}
exports.QuasarApiError = QuasarApiError;
//# sourceMappingURL=quasar-api.client.js.map