"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseHttpClient = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const TRANSIENT_STATUSES = [408, 429, 500, 502, 503, 504];
class EnterpriseHttpClient {
    instance;
    providerName;
    constructor(config) {
        this.providerName = config.providerName || 'Unknown';
        this.instance = axios_1.default.create({
            ...config,
            timeout: config.timeout || parseInt(process.env.HTTP_TIMEOUT_MS || '10000', 10)
        });
        // Request Interceptor
        this.instance.interceptors.request.use((req) => {
            const cid = config.correlationId || req.headers['X-Correlation-Id'] || req.headers['x-correlation-id'] || crypto_1.default.randomUUID();
            req.headers['X-Correlation-Id'] = cid;
            req.metadata = { startTime: Date.now(), retryCount: 0 };
            return req;
        });
        // Response Interceptor
        this.instance.interceptors.response.use((response) => {
            this.logObservability(response.config, response.status);
            this.onCircuitBreakerSuccess(this.providerName);
            return response;
        }, async (error) => {
            const config = error.config;
            if (!config || !config.metadata) {
                return Promise.reject(error);
            }
            const status = error.response?.status;
            const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.message.includes('Network Error');
            const isTransient = status ? TRANSIENT_STATUSES.includes(status) : isTimeout;
            const maxRetries = config.maxRetries ?? 3;
            if (isTransient && config.metadata.retryCount < maxRetries) {
                config.metadata.retryCount++;
                const backoff = Math.pow(2, config.metadata.retryCount) * 1000;
                const jitter = Math.floor(Math.random() * 500);
                const delay = backoff + jitter;
                console.log(`[EnterpriseHttpClient] [${config.headers['X-Correlation-Id']}] Retrying ${this.providerName} (${config.url}) in ${delay}ms... (Attempt ${config.metadata.retryCount}/${maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.instance(config);
            }
            this.logObservability(config, status || 0, error);
            this.onCircuitBreakerFailure(this.providerName, error);
            return Promise.reject(error);
        });
    }
    // Circuit Breaker Hooks (Extension Points)
    onCircuitBreakerSuccess(provider) {
        // TODO: Reset circuit breaker failure count
    }
    onCircuitBreakerFailure(provider, error) {
        // TODO: Increment circuit breaker failure count, trip if threshold exceeded
    }
    logObservability(config, status, error) {
        const latency = Date.now() - config.metadata.startTime;
        const correlationId = config.headers['X-Correlation-Id'] || config.headers['x-correlation-id'];
        console.log(`[Observability] Provider=${this.providerName} Endpoint=${config.url} CorrelationId=${correlationId} Latency=${latency}ms Status=${status} Retries=${config.metadata.retryCount} Reason=${error?.message || 'None'}`);
    }
    async get(url, config) {
        return this.instance.get(url, config);
    }
    async post(url, data, config) {
        return this.instance.post(url, data, config);
    }
    async put(url, data, config) {
        return this.instance.put(url, data, config);
    }
    async delete(url, config) {
        return this.instance.delete(url, config);
    }
    async request(config) {
        return this.instance.request(config);
    }
}
exports.EnterpriseHttpClient = EnterpriseHttpClient;
//# sourceMappingURL=http-client.js.map