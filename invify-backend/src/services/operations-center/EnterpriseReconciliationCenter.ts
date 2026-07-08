export interface ProviderTxLog {
  txId: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  providerRef: string;
}

export interface QuasarEventLog {
  eventId: string;
  reference: string;
  amount: number;
  currency: string;
  state: 'COMPLETED' | 'FAILED' | 'INITIALIZED';
}

export interface LedgerEntryLog {
  entryId: string;
  reference: string;
  amount: number; // Signed: negative for outbound, positive for inbound
  currency: string;
}

export interface ReconciliationDiscrepancy {
  id: string;
  type: 'MISSING_SETTLEMENT' | 'DUPLICATE' | 'MISMATCH' | 'TIMEOUT' | 'PARTIAL_PAYMENT' | 'WRONG_AMOUNT' | 'CURRENCY_MISMATCH';
  severity: 'WARNING' | 'CRITICAL';
  description: string;
  providerRef?: string;
  eventId?: string;
  status: 'OPEN' | 'RESOLVED' | 'ESCALATED';
  resolvedBy?: string;
  resolvedAt?: string;
}

export class EnterpriseReconciliationCenter {
  private static discrepancies: Map<string, ReconciliationDiscrepancy> = new Map();
  private static reconHistory: Array<{ providerRef: string; eventId: string; status: 'RECONCILED' | 'MANUAL' }> = [];
  private static seq = 0;

  static clearState() {
    this.discrepancies.clear();
    this.reconHistory = [];
    this.seq = 0;
  }

  static async autoReconcile(
    providerTx: ProviderTxLog,
    quasarEvent: QuasarEventLog | null,
    ledgerEntry: LedgerEntryLog | null
  ): Promise<'RECONCILED' | 'DISCREPANCY'> {
    // 1. Check Missing Event or Settlement
    if (!quasarEvent) {
      this.raiseDiscrepancy({
        type: 'MISSING_SETTLEMENT',
        severity: 'CRITICAL',
        description: `Quasar Event missing for Provider Ref: ${providerTx.providerRef}`,
        providerRef: providerTx.providerRef
      });
      return 'DISCREPANCY';
    }

    // 2. Check Timeout
    if (providerTx.status === 'PENDING' || quasarEvent.state === 'INITIALIZED') {
      this.raiseDiscrepancy({
        type: 'TIMEOUT',
        severity: 'WARNING',
        description: `Transaction pending timeout limit reached: ${providerTx.providerRef}`,
        providerRef: providerTx.providerRef,
        eventId: quasarEvent.eventId
      });
      return 'DISCREPANCY';
    }

    // 3. Check Mismatch State
    if (providerTx.status === 'SUCCESS' && quasarEvent.state === 'FAILED') {
      this.raiseDiscrepancy({
        type: 'MISMATCH',
        severity: 'CRITICAL',
        description: `Status mismatch: Provider=SUCCESS, Quasar=FAILED`,
        providerRef: providerTx.providerRef,
        eventId: quasarEvent.eventId
      });
      return 'DISCREPANCY';
    }

    // 4. Check Amount discrepancies
    if (providerTx.amount !== quasarEvent.amount) {
      const isUnder = providerTx.amount < quasarEvent.amount;
      this.raiseDiscrepancy({
        type: isUnder ? 'PARTIAL_PAYMENT' : 'WRONG_AMOUNT',
        severity: 'CRITICAL',
        description: `Amount mismatch: Provider=${providerTx.amount}, Quasar=${quasarEvent.amount}`,
        providerRef: providerTx.providerRef,
        eventId: quasarEvent.eventId
      });
      return 'DISCREPANCY';
    }

    // 5. Check Currency Mismatch
    if (providerTx.currency !== quasarEvent.currency) {
      this.raiseDiscrepancy({
        type: 'CURRENCY_MISMATCH',
        severity: 'CRITICAL',
        description: `Currency mismatch: Provider=${providerTx.currency}, Quasar=${quasarEvent.currency}`,
        providerRef: providerTx.providerRef,
        eventId: quasarEvent.eventId
      });
      return 'DISCREPANCY';
    }

    // 6. Check Ledger mismatch
    if (ledgerEntry) {
      const unsignedLedgerAmount = Math.abs(ledgerEntry.amount);
      if (unsignedLedgerAmount !== providerTx.amount) {
        this.raiseDiscrepancy({
          type: 'WRONG_AMOUNT',
          severity: 'CRITICAL',
          description: `Ledger amount mismatch: Ledger=${unsignedLedgerAmount}, Provider=${providerTx.amount}`,
          providerRef: providerTx.providerRef,
          eventId: quasarEvent.eventId
        });
        return 'DISCREPANCY';
      }
    }

    // Reconciled successfully
    this.reconHistory.push({
      providerRef: providerTx.providerRef,
      eventId: quasarEvent.eventId,
      status: 'RECONCILED'
    });
    return 'RECONCILED';
  }

  static raiseDiscrepancy(params: Omit<ReconciliationDiscrepancy, 'id' | 'status'>): ReconciliationDiscrepancy {
    const id = `REC-DIS-${++this.seq}-${Date.now()}`;
    const discrepancy: ReconciliationDiscrepancy = {
      id,
      status: 'OPEN',
      ...params
    };
    this.discrepancies.set(id, discrepancy);
    return discrepancy;
  }

  static reconcileManually(discrepancyId: string, operator: string): boolean {
    const disc = this.discrepancies.get(discrepancyId);
    if (!disc) return false;

    disc.status = 'RESOLVED';
    disc.resolvedBy = operator;
    disc.resolvedAt = new Date().toISOString();

    if (disc.providerRef && disc.eventId) {
      this.reconHistory.push({
        providerRef: disc.providerRef,
        eventId: disc.eventId,
        status: 'MANUAL'
      });
    }
    return true;
  }

  static escalate(discrepancyId: string): boolean {
    const disc = this.discrepancies.get(discrepancyId);
    if (!disc) return false;
    disc.status = 'ESCALATED';
    return true;
  }

  static getDiscrepancies(): ReconciliationDiscrepancy[] {
    return Array.from(this.discrepancies.values());
  }

  static getReconciliationHistory() {
    return this.reconHistory;
  }
}
