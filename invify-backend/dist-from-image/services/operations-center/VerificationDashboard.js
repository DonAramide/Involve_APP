"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationDashboard = void 0;
const IdempotencyRegistry_1 = require("../idempotency/IdempotencyRegistry");
class VerificationDashboard {
    /**
     * Internal counter for replay-blocked events, incremented externally
     * when IdempotencyKeyService detects a duplicate.
     */
    static replayBlockCount = 0;
    static clearMockData() {
        this.replayBlockCount = 0;
    }
    /** Called by IdempotencyKeyService when a duplicate/replay is blocked. */
    static recordReplayBlocked() {
        this.replayBlockCount++;
    }
    /**
     * Returns idempotency and replay detection statistics.
     */
    static getSnapshot() {
        const keys = IdempotencyRegistry_1.IdempotencyRegistry.getMockKeys();
        const leases = IdempotencyRegistry_1.IdempotencyRegistry.getMockLeases();
        const now = new Date();
        const totalIdempotencyKeys = keys.length;
        const completedKeys = keys.filter((k) => k.status === 'COMPLETED').length;
        const failedKeys = keys.filter((k) => k.status === 'FAILED').length;
        const activeLeases = leases.filter((l) => l.status === 'HELD' && new Date(l.expires_at) > now).length;
        const expiredLeases = leases.filter((l) => l.status === 'HELD' && new Date(l.expires_at) <= now).length;
        const replayBlockRate = totalIdempotencyKeys > 0
            ? parseFloat((this.replayBlockCount / totalIdempotencyKeys).toFixed(4))
            : 0;
        return {
            totalIdempotencyKeys,
            completedKeys,
            failedKeys,
            replayBlockedCount: this.replayBlockCount,
            replayBlockRate,
            activeLeases,
            expiredLeases,
            capturedAt: new Date().toISOString(),
        };
    }
}
exports.VerificationDashboard = VerificationDashboard;
//# sourceMappingURL=VerificationDashboard.js.map