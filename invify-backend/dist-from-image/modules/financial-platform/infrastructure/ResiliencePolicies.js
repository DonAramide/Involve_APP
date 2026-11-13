"use strict";
// invify-backend/src/modules/financial-platform/infrastructure/ResiliencePolicies.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultActivationTimeoutPolicy = exports.ExponentialBackoffRetryPolicy = exports.SimpleCircuitBreaker = void 0;
/**
 * Basic in-memory implementations for scaffolding purposes.
 * In a production environment, this might use libraries like `opossum` or `pollyjs`.
 */
class SimpleCircuitBreaker {
    failureCount = 0;
    state = 'CLOSED';
    lastFailureTime = null;
    threshold = 5;
    resetTimeoutMs = 10000;
    async execute(operation, context) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime.getTime() > this.resetTimeoutMs) {
                this.state = 'HALF_OPEN';
            }
            else {
                throw new Error('Circuit Breaker is OPEN. Operation aborted to prevent cascading failure.');
            }
        }
        try {
            const result = await operation();
            if (this.state === 'HALF_OPEN') {
                this.state = 'CLOSED';
                this.failureCount = 0;
            }
            return result;
        }
        catch (error) {
            this.failureCount++;
            this.lastFailureTime = new Date();
            if (this.failureCount >= this.threshold) {
                this.state = 'OPEN';
            }
            throw error;
        }
    }
    getStatus() {
        return { state: this.state, failureCount: this.failureCount, lastFailureTime: this.lastFailureTime };
    }
}
exports.SimpleCircuitBreaker = SimpleCircuitBreaker;
class ExponentialBackoffRetryPolicy {
    maxRetries;
    constructor(maxRetries = 3) {
        this.maxRetries = maxRetries;
    }
    async execute(operation, context) {
        let attempt = 0;
        while (attempt < this.maxRetries) {
            try {
                return await operation();
            }
            catch (error) {
                attempt++;
                // Re-throw immediately if it's a non-retriable error (e.g. 400 Bad Request or 401 Unauthorized)
                if (error.response && [400, 401, 403, 404, 409].includes(error.response.status)) {
                    throw error;
                }
                if (attempt >= this.maxRetries) {
                    throw error;
                }
                const backoffMs = Math.pow(2, attempt) * 100; // 200, 400, 800...
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
        }
        throw new Error('Retry policy exhausted');
    }
}
exports.ExponentialBackoffRetryPolicy = ExponentialBackoffRetryPolicy;
class DefaultActivationTimeoutPolicy {
    async execute(operation, timeoutMs, context) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Activation operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            operation()
                .then(res => {
                clearTimeout(timer);
                resolve(res);
            })
                .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }
}
exports.DefaultActivationTimeoutPolicy = DefaultActivationTimeoutPolicy;
//# sourceMappingURL=ResiliencePolicies.js.map