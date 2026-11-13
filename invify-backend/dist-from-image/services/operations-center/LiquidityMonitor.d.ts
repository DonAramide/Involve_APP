import { AlertIncident } from '../observability/ObservabilityRegistry';
export interface LiquiditySnapshot {
    /** Total float available in the banking pool (NGN, paise) */
    totalFloat: number;
    /** Amount currently allocated/utilized */
    utilized: number;
    /** Remaining available float */
    available: number;
    /** Ratio: available / totalFloat — range [0,1] */
    coverageRatio: number;
    /** True when coverageRatio < LOW_LIQUIDITY_THRESHOLD */
    lowLiquidityAlert: boolean;
    /** Fired alert incidents if threshold was crossed */
    alerts: AlertIncident[];
    capturedAt: string;
}
export declare class LiquidityMonitor {
    private static totalFloat;
    private static utilized;
    static clearMockData(): void;
    /**
     * Seeds the mock liquidity pool for testing and ops monitoring.
     */
    static seedPool(totalFloat: number, utilized: number): void;
    /**
     * Evaluates liquidity health and fires alert rules when ratio is low.
     */
    static getSnapshot(): Promise<LiquiditySnapshot>;
}
