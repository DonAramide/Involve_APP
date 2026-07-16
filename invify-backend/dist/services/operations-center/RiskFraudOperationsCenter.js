"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskFraudOperationsCenter = void 0;
class RiskFraudOperationsCenter {
    static blockedAccounts = new Set();
    static suspiciousMerchants = new Map();
    static blacklistedNames = new Set(['EVIL ORG', 'SCAMMER INC']);
    static trustedDevices = new Set(['dev-fingerprint-001', 'dev-fingerprint-002']);
    static geoBlacklist = new Set(['KP', 'SY', 'IR']);
    static clearState() {
        this.blockedAccounts.clear();
        this.suspiciousMerchants.clear();
        this.blacklistedNames = new Set(['EVIL ORG', 'SCAMMER INC']);
        this.trustedDevices = new Set(['dev-fingerprint-001', 'dev-fingerprint-002']);
        this.geoBlacklist = new Set(['KP', 'SY', 'IR']);
    }
    static blockAccount(accountId) {
        this.blockedAccounts.add(accountId);
    }
    static flagMerchant(merchantId, riskRating, chargebackRatio) {
        this.suspiciousMerchants.set(merchantId, { riskRating, chargebackRatio });
    }
    static evaluateRisk(context) {
        const violations = [];
        const alerts = [];
        let score = 0;
        // 1. Account status checks (AML/Blocked)
        if (this.blockedAccounts.has(context.accountId)) {
            score += 100;
            violations.push('Account explicitly blocked');
            alerts.push({
                id: `ALT-AML-${Date.now()}`,
                metric: 'AML',
                severity: 'CRITICAL',
                message: `Blocked account attempted transaction: ${context.accountId}`,
                triggeredAt: new Date().toISOString()
            });
        }
        // 2. Velocity evaluation
        if (context.velocityWindowCount > 20) {
            score += 60;
            violations.push('High transaction velocity limit reached');
            alerts.push({
                id: `ALT-VEL-${Date.now()}`,
                metric: 'VELOCITY',
                severity: 'CRITICAL',
                message: `Velocity threshold breached: ${context.velocityWindowCount} requests/min`,
                triggeredAt: new Date().toISOString()
            });
        }
        else if (context.velocityWindowCount > 10) {
            score += 40;
            violations.push('Elevated transaction frequency');
            alerts.push({
                id: `ALT-VEL-${Date.now()}`,
                metric: 'VELOCITY',
                severity: 'WARNING',
                message: `Velocity rate limit warning: ${context.velocityWindowCount} requests/min`,
                triggeredAt: new Date().toISOString()
            });
        }
        // 3. Device authentication risk
        if (!this.trustedDevices.has(context.deviceFingerprint)) {
            score += 25;
            violations.push('Untrusted hardware identifier signature');
            alerts.push({
                id: `ALT-DEV-${Date.now()}`,
                metric: 'DEVICE',
                severity: 'WARNING',
                message: `Untrusted hardware footprint device: ${context.deviceName}`,
                triggeredAt: new Date().toISOString()
            });
        }
        // 4. Geo location risk
        if (this.geoBlacklist.has(context.country)) {
            score += 50;
            violations.push(`Blacklisted location: ${context.country}`);
            alerts.push({
                id: `ALT-GEO-${Date.now()}`,
                metric: 'GEO',
                severity: 'CRITICAL',
                message: `Fencing violation: IP originating from blacklisted region (${context.country})`,
                triggeredAt: new Date().toISOString()
            });
        }
        // 5. Merchant risks
        const merchant = this.suspiciousMerchants.get(context.merchantId);
        if (merchant) {
            score += 30;
            if (merchant.chargebackRatio > 0.05) {
                score += 20;
                violations.push('High chargeback merchant trigger');
                alerts.push({
                    id: `ALT-MER-${Date.now()}`,
                    metric: 'MERCHANT',
                    severity: 'CRITICAL',
                    message: `risky merchant chargeback ratio: ${merchant.chargebackRatio * 100}%`,
                    triggeredAt: new Date().toISOString()
                });
            }
        }
        // Caps score at 100
        score = Math.min(100, score);
        let decision = 'ALLOW';
        if (score >= 60 || this.blockedAccounts.has(context.accountId) || this.geoBlacklist.has(context.country)) {
            decision = 'BLOCK';
        }
        else if (score >= 40) {
            decision = 'REVIEW';
        }
        return {
            score,
            decision,
            violations,
            alerts
        };
    }
    static getSnapshot() {
        const listAlerts = [];
        if (this.blockedAccounts.size > 10) {
            listAlerts.push({
                id: `ALT-SYS-1`,
                metric: 'AML',
                severity: 'WARNING',
                message: `System blocking threshold exceeded: ${this.blockedAccounts.size} active blocked accounts`,
                triggeredAt: new Date().toISOString()
            });
        }
        return {
            globalRiskScore: this.blockedAccounts.size > 0 ? 45 : 12,
            blockedAccountsCount: this.blockedAccounts.size,
            suspiciousMerchantsCount: this.suspiciousMerchants.size,
            alerts: listAlerts,
            capturedAt: new Date().toISOString()
        };
    }
}
exports.RiskFraudOperationsCenter = RiskFraudOperationsCenter;
//# sourceMappingURL=RiskFraudOperationsCenter.js.map