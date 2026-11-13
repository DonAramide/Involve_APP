export interface VerificationDashboardSnapshot {
    totalIdempotencyKeys: number;
    /** Keys with status = COMPLETED (successfully resolved) */
    completedKeys: number;
    /** Keys with status = FAILED (rejected/error) */
    failedKeys: number;
    /** Keys identified as replay attempts (duplicate requests blocked) */
    replayBlockedCount: number;
    /** Ratio of replays blocked vs total keys, range [0,1] */
    replayBlockRate: number;
    activeLeases: number;
    expiredLeases: number;
    capturedAt: string;
}
export declare class VerificationDashboard {
    /**
     * Internal counter for replay-blocked events, incremented externally
     * when IdempotencyKeyService detects a duplicate.
     */
    private static replayBlockCount;
    static clearMockData(): void;
    /** Called by IdempotencyKeyService when a duplicate/replay is blocked. */
    static recordReplayBlocked(): void;
    /**
     * Returns idempotency and replay detection statistics.
     */
    static getSnapshot(): VerificationDashboardSnapshot;
}
