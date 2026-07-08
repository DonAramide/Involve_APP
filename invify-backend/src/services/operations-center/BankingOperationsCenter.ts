import { ProviderHealthMonitor, ProviderHealthSnapshot } from './ProviderHealthMonitor';
import { TreasuryMonitor, TreasurySnapshot } from './TreasuryMonitor';
import { SettlementMonitor, SettlementSnapshot } from './SettlementMonitor';
import { LiquidityMonitor, LiquiditySnapshot } from './LiquidityMonitor';
import { WebhookMonitor, WebhookMonitorSnapshot } from './WebhookMonitor';
import { QueueMonitor, QueueMonitorSnapshot } from './QueueMonitor';
import { TransferMonitor, TransferMonitorSnapshot } from './TransferMonitor';
import { CertificateMonitor, CertificateMonitorSnapshot } from './CertificateMonitor';
import { SecretRotationMonitor, SecretRotationSnapshot } from './SecretRotationMonitor';
import { CircuitBreakerMonitor, CircuitBreakerSnapshot } from './CircuitBreakerMonitor';
import { RiskDashboard, RiskDashboardSnapshot } from './RiskDashboard';
import { VerificationDashboard, VerificationDashboardSnapshot } from './VerificationDashboard';
import { IncidentDashboard, IncidentDashboardSnapshot } from './IncidentDashboard';

export interface FullOperationalSnapshot {
  /** Composite operational health score: 0 (critical) – 100 (fully healthy) */
  operationalScore: number;
  /** Human-readable status label derived from operationalScore */
  operationalStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  providerHealth: ProviderHealthSnapshot;
  treasury: TreasurySnapshot;
  settlement: SettlementSnapshot;
  liquidity: LiquiditySnapshot;
  webhooks: WebhookMonitorSnapshot;
  queues: QueueMonitorSnapshot;
  transfers: TransferMonitorSnapshot;
  certificates: CertificateMonitorSnapshot;
  secretRotation: SecretRotationSnapshot;
  circuitBreakers: CircuitBreakerSnapshot;
  risk: RiskDashboardSnapshot;
  verification: VerificationDashboardSnapshot;
  incidents: IncidentDashboardSnapshot;
  capturedAt: string;
}

export class BankingOperationsCenter {
  /**
   * Captures a full operational snapshot across all 13 monitoring modules.
   *
   * operationalScore algorithm:
   *   - Start at 100
   *   - Deduct 10 per unhealthy provider (max –40)
   *   - Deduct 5 per open circuit breaker (max –20)
   *   - Deduct 15 if low liquidity alert is active
   *   - Deduct 2 per open incident (max –20)
   *   - Deduct 1 per expiring cert (max –10)
   *   - Deduct 1 per overdue rotation (max –5)
   *   - Floor at 0
   */
  static async getFullSnapshot(): Promise<FullOperationalSnapshot> {
    const [
      providerHealth,
      treasury,
      settlement,
      liquidity,
      webhooks,
      queues,
      transfers,
      certificates,
      secretRotation,
      incidents,
    ] = await Promise.all([
      Promise.resolve(ProviderHealthMonitor.getSnapshot()),
      Promise.resolve(TreasuryMonitor.getSnapshot()),
      SettlementMonitor.getSnapshot(),
      LiquidityMonitor.getSnapshot(),
      WebhookMonitor.getSnapshot(),
      QueueMonitor.getSnapshot(),
      TransferMonitor.getSnapshot(),
      Promise.resolve(CertificateMonitor.getSnapshot()),
      SecretRotationMonitor.getSnapshot(),
      Promise.resolve(IncidentDashboard.getSnapshot()),
    ]);

    // These are synchronous — call after async batch
    const circuitBreakers = CircuitBreakerMonitor.getSnapshot();
    const risk = RiskDashboard.getSnapshot();
    const verification = VerificationDashboard.getSnapshot();

    // ─── Operational Score ───────────────────────────────────────────────────
    let score = 100;

    // Provider health deductions
    score -= Math.min(providerHealth.unhealthyProviders * 10, 40);

    // Circuit breaker deductions
    score -= Math.min(circuitBreakers.openCircuits * 5, 20);

    // Liquidity deduction
    if (liquidity.lowLiquidityAlert) {
      score -= 15;
    }

    // Open incident deductions
    score -= Math.min(incidents.openIncidents * 2, 20);

    // Certificate expiry deductions
    score -= Math.min(certificates.expiringCerts * 1, 10);

    // Overdue rotation deductions
    score -= Math.min(secretRotation.overdueRotations * 1, 5);

    score = Math.max(0, Math.min(100, score));

    const operationalStatus: FullOperationalSnapshot['operationalStatus'] =
      score >= 80 ? 'HEALTHY' : score >= 50 ? 'DEGRADED' : 'CRITICAL';

    const capturedAt = new Date().toISOString();

    return {
      operationalScore: score,
      operationalStatus,
      providerHealth,
      treasury,
      settlement,
      liquidity,
      webhooks,
      queues,
      transfers,
      certificates,
      secretRotation,
      circuitBreakers,
      risk,
      verification,
      incidents,
      capturedAt,
    };
  }
}
