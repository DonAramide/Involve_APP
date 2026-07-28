// invify-backend/src/modules/financial-platform/infrastructure/ResiliencePolicies.ts

import { ObservabilityContext } from '../domain/Types';

export interface RetryPolicy {
  execute<T>(operation: () => Promise<T>, context: ObservabilityContext): Promise<T>;
}

export interface CircuitBreaker {
  execute<T>(operation: () => Promise<T>, context: ObservabilityContext): Promise<T>;
  getStatus(): { state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'; failureCount: number; lastFailureTime: Date | null };
}

export interface ActivationTimeoutPolicy {
  execute<T>(operation: () => Promise<T>, timeoutMs: number, context: ObservabilityContext): Promise<T>;
}

/**
 * Basic in-memory implementations for scaffolding purposes.
 * In a production environment, this might use libraries like `opossum` or `pollyjs`.
 */
export class SimpleCircuitBreaker implements CircuitBreaker {
  private failureCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime: Date | null = null;
  private readonly threshold = 5;
  private readonly resetTimeoutMs = 10000;

  async execute<T>(operation: () => Promise<T>, context: ObservabilityContext): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
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
    } catch (error) {
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

export class ExponentialBackoffRetryPolicy implements RetryPolicy {
  constructor(private maxRetries: number = 3) {}

  async execute<T>(operation: () => Promise<T>, context: ObservabilityContext): Promise<T> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        return await operation();
      } catch (error: any) {
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

export class DefaultActivationTimeoutPolicy implements ActivationTimeoutPolicy {
  async execute<T>(operation: () => Promise<T>, timeoutMs: number, context: ObservabilityContext): Promise<T> {
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
