import { StateRepairService } from '../disaster-recovery/StateRepairService';

export interface TreasurySnapshot {
  /** Sum of all tracked wallet balances */
  totalFloat: number;
  walletCount: number;
  averageBalance: number;
  /** Number of wallets with detected ledger discrepancies (repaired or not) */
  discrepancyCount: number;
  capturedAt: string;
}

export class TreasuryMonitor {
  /**
   * Internal mock ledger tracking for test/ops observation.
   * Production would query the wallets table directly.
   */
  private static mockTreasuryEntries: Array<{ tenantId: string; balance: number; discrepant: boolean }> = [];

  static clearMockData() {
    this.mockTreasuryEntries = [];
  }

  /**
   * Seed a treasury entry for operations monitoring.
   */
  static seedEntry(tenantId: string, balance: number, discrepant = false) {
    const existing = this.mockTreasuryEntries.findIndex((e) => e.tenantId === tenantId);
    if (existing !== -1) {
      this.mockTreasuryEntries[existing] = { tenantId, balance, discrepant };
    } else {
      this.mockTreasuryEntries.push({ tenantId, balance, discrepant });
    }
  }

  /**
   * Returns a real-time treasury snapshot.
   */
  static getSnapshot(): TreasurySnapshot {
    const entries = this.mockTreasuryEntries;
    const totalFloat = entries.reduce((acc, e) => acc + e.balance, 0);
    const walletCount = entries.length;
    const averageBalance = walletCount > 0 ? totalFloat / walletCount : 0;
    const discrepancyCount = entries.filter((e) => e.discrepant).length;

    return {
      totalFloat,
      walletCount,
      averageBalance,
      discrepancyCount,
      capturedAt: new Date().toISOString(),
    };
  }
}
