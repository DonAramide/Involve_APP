import { IdempotencyRegistry, IdempotencyKeyRecord, ExecutionLease } from '../idempotency/IdempotencyRegistry';

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

export class VerificationDashboard {
  /**
   * Internal counter for replay-blocked events, incremented externally
   * when IdempotencyKeyService detects a duplicate.
   */
  private static replayBlockCount = 0;

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
  static getSnapshot(): VerificationDashboardSnapshot {
    const keys = IdempotencyRegistry.getMockKeys();
    const leases = IdempotencyRegistry.getMockLeases();
    const now = new Date();

    const totalIdempotencyKeys = keys.length;
    const completedKeys = keys.filter((k: any) => k.status === 'COMPLETED').length;
    const failedKeys = keys.filter((k: any) => k.status === 'FAILED').length;

    const activeLeases = leases.filter(
      (l: any) => l.status === 'HELD' && new Date(l.expires_at) > now
    ).length;
    const expiredLeases = leases.filter(
      (l: any) => l.status === 'HELD' && new Date(l.expires_at) <= now
    ).length;

    const replayBlockRate =
      totalIdempotencyKeys > 0
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
