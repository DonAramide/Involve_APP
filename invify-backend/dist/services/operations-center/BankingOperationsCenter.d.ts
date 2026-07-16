import { ProviderHealthSnapshot } from './ProviderHealthMonitor';
import { TreasurySnapshot } from './TreasuryMonitor';
import { SettlementSnapshot } from './SettlementMonitor';
import { LiquiditySnapshot } from './LiquidityMonitor';
import { WebhookMonitorSnapshot } from './WebhookMonitor';
import { QueueMonitorSnapshot } from './QueueMonitor';
import { TransferMonitorSnapshot } from './TransferMonitor';
import { CertificateMonitorSnapshot } from './CertificateMonitor';
import { SecretRotationSnapshot } from './SecretRotationMonitor';
import { CircuitBreakerSnapshot } from './CircuitBreakerMonitor';
import { RiskDashboardSnapshot } from './RiskDashboard';
import { VerificationDashboardSnapshot } from './VerificationDashboard';
import { IncidentDashboardSnapshot } from './IncidentDashboard';
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
export declare class BankingOperationsCenter {
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
    static getFullSnapshot(): Promise<FullOperationalSnapshot>;
}
