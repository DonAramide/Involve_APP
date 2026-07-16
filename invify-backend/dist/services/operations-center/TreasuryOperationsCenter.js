"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryOperationsCenter = void 0;
class TreasuryOperationsCenter {
    static platformFloat = 150_000_000;
    static reserveRequirement = 50_000_000;
    static providerFloats = {
        PAYSTACK: 30_000_000,
        FLUTTERWAVE: 25_000_000,
        PROVIDUS: 10_000_000,
        WEMA: 15_000_000
    };
    static pendingInboundSettlements = {
        PAYSTACK: 5_000_000,
        FLUTTERWAVE: 12_000_000,
        PROVIDUS: 2_000_000,
        WEMA: 1_000_000
    };
    static clearState() {
        this.platformFloat = 150_000_000;
        this.reserveRequirement = 50_000_000;
        this.providerFloats = { PAYSTACK: 30_000_000, FLUTTERWAVE: 25_000_000, PROVIDUS: 10_000_000, WEMA: 15_000_000 };
        this.pendingInboundSettlements = { PAYSTACK: 5_000_000, FLUTTERWAVE: 12_000_000, PROVIDUS: 2_000_000, WEMA: 1_000_000 };
    }
    static setPlatformFloat(amount) {
        this.platformFloat = amount;
    }
    static setReserveRequirement(amount) {
        this.reserveRequirement = amount;
    }
    static setProviderFloat(provider, amount) {
        this.providerFloats[provider.toUpperCase()] = amount;
    }
    static setPendingInboundSettlement(provider, amount) {
        this.pendingInboundSettlements[provider.toUpperCase()] = amount;
    }
    static getSnapshot() {
        const exposures = ['PAYSTACK', 'FLUTTERWAVE', 'PROVIDUS', 'WEMA'].map(p => {
            const floatVal = this.providerFloats[p] ?? 0;
            const pendingVal = this.pendingInboundSettlements[p] ?? 0;
            const totalExposure = floatVal + pendingVal;
            const exposureLimit = 40_000_000; // Mock threshold limit
            let status = 'SAFE';
            if (totalExposure > exposureLimit * 0.9) {
                status = 'CRITICAL';
            }
            else if (totalExposure > exposureLimit * 0.75) {
                status = 'WARNING';
            }
            return {
                provider: p,
                floatBalance: floatVal,
                pendingInboundSettlements: pendingVal,
                totalExposure,
                exposureLimit,
                status
            };
        });
        const lcr = parseFloat((this.platformFloat / this.reserveRequirement).toFixed(2));
        const alerts = [];
        if (lcr < 1.0) {
            alerts.push({
                id: `ALT-LCR-${Date.now()}`,
                severity: 'CRITICAL',
                metric: 'LIQUIDITY_COVERAGE_RATIO',
                message: `Liquidity coverage ratio is below 1.0 threshold (Current LCR: ${lcr})`,
                triggeredAt: new Date().toISOString()
            });
        }
        else if (lcr < 1.5) {
            alerts.push({
                id: `ALT-LCR-${Date.now()}`,
                severity: 'WARNING',
                metric: 'LIQUIDITY_COVERAGE_RATIO',
                message: `Liquidity coverage ratio is approaching reserve boundaries (Current LCR: ${lcr})`,
                triggeredAt: new Date().toISOString()
            });
        }
        for (const exp of exposures) {
            if (exp.status === 'CRITICAL') {
                alerts.push({
                    id: `ALT-EXP-${exp.provider}-${Date.now()}`,
                    severity: 'CRITICAL',
                    metric: `EXPOSURE_${exp.provider}`,
                    message: `${exp.provider} exposure has crossed threshold limits (Current: ${exp.totalExposure.toLocaleString()})`,
                    triggeredAt: new Date().toISOString()
                });
            }
        }
        // Mock forecasting projection logic
        const forecast = {
            day1ProjectedInflow: 50_000_000,
            day1ProjectedOutflow: 45_000_000,
            day2ProjectedInflow: 55_000_000,
            day2ProjectedOutflow: 52_000_000,
            day3ProjectedInflow: 60_000_000,
            day3ProjectedOutflow: 58_000_000,
            predictedTrend: lcr < 1.0 ? 'DEPLETING' : 'STABLE'
        };
        return {
            platformFloat: this.platformFloat,
            reserveRequirement: this.reserveRequirement,
            liquidityCoverageRatio: lcr,
            exposures,
            forecast,
            alerts,
            capturedAt: new Date().toISOString()
        };
    }
}
exports.TreasuryOperationsCenter = TreasuryOperationsCenter;
//# sourceMappingURL=TreasuryOperationsCenter.js.map