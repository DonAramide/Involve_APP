import { ObservabilityContext } from '../domain/Types';
export interface RetryPolicy {
    execute<T>(operation: () => Promise<T>, context: ObservabilityContext): Promise<T>;
}
export interface CircuitBreaker {
    execute<T>(operation: () => Promise<T>, context: ObservabilityContext): Promise<T>;
    getStatus(): {
        state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
        failureCount: number;
        lastFailureTime: Date | null;
    };
}
export interface ActivationTimeoutPolicy {
    execute<T>(operation: () => Promise<T>, timeoutMs: number, context: ObservabilityContext): Promise<T>;
}
/**
 * Basic in-memory implementations for scaffolding purposes.
 * In a production environment, this might use libraries like `opossum` or `pollyjs`.
 */
export declare class SimpleCircuitBreaker implements CircuitBreaker {
    private failureCount;
    private state;
    private lastFailureTime;
    private readonly threshold;
    private readonly resetTimeoutMs;
    execute<T>(operation: () => Promise<T>, context: ObservabilityContext): Promise<T>;
    getStatus(): {
        state: "CLOSED" | "OPEN" | "HALF_OPEN";
        failureCount: number;
        lastFailureTime: Date | null;
    };
}
export declare class ExponentialBackoffRetryPolicy implements RetryPolicy {
    private maxRetries;
    constructor(maxRetries?: number);
    execute<T>(operation: () => Promise<T>, context: ObservabilityContext): Promise<T>;
}
export declare class DefaultActivationTimeoutPolicy implements ActivationTimeoutPolicy {
    execute<T>(operation: () => Promise<T>, timeoutMs: number, context: ObservabilityContext): Promise<T>;
}
