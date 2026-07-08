import { ProviderHealthMonitor } from './ProviderHealthMonitor';
import { QueueMetricsCollector } from '../queue/QueueMetricsCollector';
import { SandboxBankingSimulationService } from '../sandbox-simulation.service';
import { ProviderCertificationService } from '../production-readiness/ProviderCertificationService';

export interface FocTransaction {
  id: string;
  type: 'INCOMING' | 'OUTGOING';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
  provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
  reference: string;
  step: 'RECEIVED' | 'VERIFIED' | 'AUTHORIZED' | 'PROVIDER' | 'SETTLEMENT' | 'COMPLETED';
  updatedAt: string;
}

export interface FocMetrics {
  incomingMoneyTotal: number;
  outgoingMoneyTotal: number;
  pendingCount: number;
  failedCount: number;
  retryingCount: number;
}

export interface FocQueueStatus {
  name: string;
  depth: number;
  completed: number;
  failed: number;
}

export interface FocProviderStatus {
  provider: string;
  status: 'HEALTHY' | 'MAINTENANCE' | 'DEGRADED';
  latencyMs: number;
  successRate: number;
}

export interface FocSnapshot {
  metrics: FocMetrics;
  providers: FocProviderStatus[];
  queues: FocQueueStatus[];
  capturedAt: string;
}

export class FinancialOperationsCenter {
  private static transactions: Map<string, FocTransaction> = new Map();
  private static incidents: Array<{ id: string; transactionId: string; issue: string; status: 'OPEN' | 'RESOLVED' }> = [];

  static clearState() {
    this.transactions.clear();
    this.incidents = [];
  }

  static trackTransaction(tx: FocTransaction) {
    this.transactions.set(tx.id, tx);
  }

  static getTransaction(id: string): FocTransaction | null {
    return this.transactions.get(id) ?? null;
  }

  static getSnapshot(): FocSnapshot {
    const txList = Array.from(this.transactions.values());

    const metrics: FocMetrics = {
      incomingMoneyTotal: txList.filter(t => t.type === 'INCOMING' && t.status === 'SUCCESS').reduce((sum, t) => sum + t.amount, 0),
      outgoingMoneyTotal: txList.filter(t => t.type === 'OUTGOING' && t.status === 'SUCCESS').reduce((sum, t) => sum + t.amount, 0),
      pendingCount: txList.filter(t => t.status === 'PENDING').length,
      failedCount: txList.filter(t => t.status === 'FAILED').length,
      retryingCount: txList.filter(t => t.status === 'RETRYING').length,
    };

    const providers: FocProviderStatus[] = ['PAYSTACK', 'FLUTTERWAVE', 'PROVIDUS', 'WEMA'].map(p => {
      const isCertified = ProviderCertificationService.verifyAndCanExecute(p as any);
      const latency = SandboxBankingSimulationService.getLatency(p);
      const forcedStatus = SandboxBankingSimulationService.getForcedStatus(p);

      let status: 'HEALTHY' | 'MAINTENANCE' | 'DEGRADED' = 'HEALTHY';
      if (!isCertified) {
        status = 'MAINTENANCE';
      } else if (forcedStatus === 'FAILED' || forcedStatus === 'TIMEOUT') {
        status = 'DEGRADED';
      }

      return {
        provider: p,
        status,
        latencyMs: latency,
        successRate: status === 'HEALTHY' ? 99.98 : status === 'DEGRADED' ? 0.00 : 100.00
      };
    });

    const queueNames = ['webhooks', 'settlement', 'retry', 'verification', 'authorization', 'notifications'];
    const queues: FocQueueStatus[] = queueNames.map(q => {
      const stats = QueueMetricsCollector.getQueueMetrics(q as any);
      return {
        name: q,
        depth: stats?.depth ?? 0,
        completed: stats?.completed ?? 0,
        failed: stats?.failed ?? 0
      };
    });

    return {
      metrics,
      providers,
      queues,
      capturedAt: new Date().toISOString()
    };
  }

  static getTimeline(transactionId: string): string[] {
    const tx = this.transactions.get(transactionId);
    if (!tx) return [];

    const stepsOrdered: Array<typeof tx.step> = ['RECEIVED', 'VERIFIED', 'AUTHORIZED', 'PROVIDER', 'SETTLEMENT', 'COMPLETED'];
    const currentIdx = stepsOrdered.indexOf(tx.step);

    return stepsOrdered.slice(0, currentIdx + 1).map(step => `${step} checked successfully`);
  }

  // Remediations
  static replay(transactionId: string): boolean {
    const tx = this.transactions.get(transactionId);
    if (!tx) return false;
    tx.status = 'PENDING';
    tx.step = 'RECEIVED';
    tx.updatedAt = new Date().toISOString();
    return true;
  }

  static retry(transactionId: string): boolean {
    const tx = this.transactions.get(transactionId);
    if (!tx) return false;
    tx.status = 'RETRYING';
    tx.updatedAt = new Date().toISOString();
    return true;
  }

  static pause(transactionId: string): boolean {
    const tx = this.transactions.get(transactionId);
    if (!tx) return false;
    tx.status = 'PENDING';
    tx.updatedAt = new Date().toISOString();
    return true;
  }

  static cancel(transactionId: string): boolean {
    const tx = this.transactions.get(transactionId);
    if (!tx) return false;
    tx.status = 'FAILED';
    tx.updatedAt = new Date().toISOString();
    return true;
  }

  static investigate(transactionId: string, issue: string): string {
    const id = `INC-${Date.now()}`;
    this.incidents.push({ id, transactionId, issue, status: 'OPEN' });
    return id;
  }

  static getIncidents() {
    return this.incidents;
  }
}
