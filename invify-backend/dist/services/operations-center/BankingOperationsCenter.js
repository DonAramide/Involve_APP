"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingOperationsCenter = void 0;
const ProviderHealthMonitor_1 = require("./ProviderHealthMonitor");
const TreasuryMonitor_1 = require("./TreasuryMonitor");
const SettlementMonitor_1 = require("./SettlementMonitor");
const LiquidityMonitor_1 = require("./LiquidityMonitor");
const WebhookMonitor_1 = require("./WebhookMonitor");
const QueueMonitor_1 = require("./QueueMonitor");
const TransferMonitor_1 = require("./TransferMonitor");
const CertificateMonitor_1 = require("./CertificateMonitor");
const SecretRotationMonitor_1 = require("./SecretRotationMonitor");
const CircuitBreakerMonitor_1 = require("./CircuitBreakerMonitor");
const RiskDashboard_1 = require("./RiskDashboard");
const VerificationDashboard_1 = require("./VerificationDashboard");
const IncidentDashboard_1 = require("./IncidentDashboard");
class BankingOperationsCenter {
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
    static async getFullSnapshot() {
        const [providerHealth, treasury, settlement, liquidity, webhooks, queues, transfers, certificates, secretRotation, incidents,] = await Promise.all([
            Promise.resolve(ProviderHealthMonitor_1.ProviderHealthMonitor.getSnapshot()),
            Promise.resolve(TreasuryMonitor_1.TreasuryMonitor.getSnapshot()),
            SettlementMonitor_1.SettlementMonitor.getSnapshot(),
            LiquidityMonitor_1.LiquidityMonitor.getSnapshot(),
            WebhookMonitor_1.WebhookMonitor.getSnapshot(),
            QueueMonitor_1.QueueMonitor.getSnapshot(),
            TransferMonitor_1.TransferMonitor.getSnapshot(),
            Promise.resolve(CertificateMonitor_1.CertificateMonitor.getSnapshot()),
            SecretRotationMonitor_1.SecretRotationMonitor.getSnapshot(),
            Promise.resolve(IncidentDashboard_1.IncidentDashboard.getSnapshot()),
        ]);
        // These are synchronous — call after async batch
        const circuitBreakers = CircuitBreakerMonitor_1.CircuitBreakerMonitor.getSnapshot();
        const risk = RiskDashboard_1.RiskDashboard.getSnapshot();
        const verification = VerificationDashboard_1.VerificationDashboard.getSnapshot();
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
        const operationalStatus = score >= 80 ? 'HEALTHY' : score >= 50 ? 'DEGRADED' : 'CRITICAL';
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
exports.BankingOperationsCenter = BankingOperationsCenter;
//# sourceMappingURL=BankingOperationsCenter.js.map