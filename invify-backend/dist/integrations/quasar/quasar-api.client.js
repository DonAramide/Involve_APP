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
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_PROBE_INTERVAL_MS = 30_000;
const circuitState = {
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
function isCircuitOpen() {
    if (!circuitState.isOpen)
        return false;
    const elapsed = Date.now() - (circuitState.openedAt ?? 0);
    if (elapsed >= CIRCUIT_PROBE_INTERVAL_MS) {
        // Half-open: allow one probe
        console.warn('[QuasarApiClient] Circuit HALF-OPEN — probing Quasar.');
        return false;
    }
    return true;
}
// ─── Retry ────────────────────────────────────────────────────────────────────
function isRetryable(status) {
    return status === 429 || status >= 500;
}
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
        const correlationId = opts.correlationId ?? crypto.randomUUID();
        const headers = {
            'X-Correlation-Id': correlationId,
        };
        if (opts.idempotencyKey) {
            headers['Idempotency-Key'] = opts.idempotencyKey;
        }
        if (this.options.tenantApiKey) {
            headers['Authorization'] = `Bearer ${this.options.tenantApiKey}`;
        }
        else if (this.options.partnerAuth) {
            headers['X-Quasar-Client-Id'] = this.options.partnerAuth.clientId;
            headers['X-Quasar-Client-Secret'] = this.options.partnerAuth.clientSecret;
        }
        return headers;
    }
    // ── QFP envelope unwrapper ────────────────────────────────────────────────
    unwrap(response, path) {
        if (response.responseCode !== '00') {
            throw new QuasarApiError(response.responseMessage || 'Quasar API returned non-00 response', response.responseCode, path);
        }
        return response.data;
    }
    // ── Core request with retry + circuit breaker ─────────────────────────────
    async request(config, reqOpts = {}) {
        const { maxRetries, noRetry } = { noRetry: reqOpts.noRetry ?? false, maxRetries: this.options.maxRetries };
        const headers = this.buildAuthHeaders(reqOpts);
        const path = `${config.method?.toUpperCase()} ${config.url}`;
        if (isCircuitOpen()) {
            throw new QuasarApiError('Quasar circuit breaker is open — requests suspended. Will retry automatically.', 'CIRCUIT_OPEN', path);
        }
        let lastError = null;
        const attempts = noRetry ? 1 : maxRetries;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                const response = await this.http.request({
                    ...config,
                    headers: { ...config.headers, ...headers },
                });
                recordSuccess();
                const unwrapped = this.unwrap(response.data, path);
                this.log('info', path, headers['X-Correlation-Id'], `Success (attempt ${attempt})`);
                return unwrapped;
            }
            catch (err) {
                const status = err?.response?.status ?? 0;
                const axiosData = err?.response?.data;
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
                }
                else if (status >= 400 && status < 500) {
                    // Client error — don't retry, don't record as Quasar failure
                    throw new QuasarApiError(message, axiosData?.responseCode ?? String(status), path);
                }
                else {
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
    log(level, path, correlationId, message) {
        const entry = JSON.stringify({ ts: new Date().toISOString(), level, path, correlationId, message });
        if (level === 'error')
            console.error(`[QuasarApiClient] ${entry}`);
        else if (level === 'warn')
            console.warn(`[QuasarApiClient] ${entry}`);
        else
            console.log(`[QuasarApiClient] ${entry}`);
    }
    /** Expose the circuit breaker state for health monitoring */
    static getCircuitState() {
        return { ...circuitState };
    }
    /**
     * Reset the circuit breaker to closed state.
     * Use in test teardown only — never call in production code.
     */
    static resetCircuit() {
        circuitState.failures = 0;
        circuitState.isOpen = false;
        circuitState.openedAt = null;
    }
}
exports.QuasarApiClient = QuasarApiClient;
// ─── Error Type ───────────────────────────────────────────────────────────────
class QuasarApiError extends Error {
    responseCode;
    path;
    constructor(message, responseCode, path) {
        super(message);
        this.responseCode = responseCode;
        this.path = path;
        this.name = 'QuasarApiError';
    }
}
exports.QuasarApiError = QuasarApiError;
//# sourceMappingURL=quasar-api.client.js.map