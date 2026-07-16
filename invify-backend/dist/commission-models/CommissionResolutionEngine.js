"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionResolutionEngine = exports.CommissionModelType = void 0;
var CommissionModelType;
(function (CommissionModelType) {
    CommissionModelType["PERCENTAGE"] = "PERCENTAGE";
    CommissionModelType["FLAT"] = "FLAT";
    CommissionModelType["HYBRID"] = "HYBRID";
})(CommissionModelType || (exports.CommissionModelType = CommissionModelType = {}));
class CommissionResolutionEngine {
    /**
     * Resolves the commission payout for a given transaction using a snapshotted commission profile.
     * This MUST integrate with FinancialRuleEngine and Billing Governance.
     */
    resolveCommission(transactionAmount, transactionType, profileSnapshot) {
        let calculatedAmount = 0;
        const appliedRules = [];
        // NO hardcoded commission calculations allowed; they all drive off the snapshot
        switch (profileSnapshot.modelType) {
            case CommissionModelType.PERCENTAGE:
                if (!profileSnapshot.percentageRate)
                    throw new Error('Percentage rate missing in snapshot.');
                calculatedAmount = transactionAmount * (profileSnapshot.percentageRate / 100);
                appliedRules.push(`Percentage Model: ${profileSnapshot.percentageRate}%`);
                break;
            case CommissionModelType.FLAT:
                if (profileSnapshot.flatRate === undefined)
                    throw new Error('Flat rate missing in snapshot.');
                calculatedAmount = profileSnapshot.flatRate;
                appliedRules.push(`Flat Model: ${profileSnapshot.flatRate}`);
                break;
            case CommissionModelType.HYBRID:
                if (profileSnapshot.percentageRate === undefined || profileSnapshot.flatRate === undefined) {
                    throw new Error('Percentage or Flat rate missing in hybrid snapshot.');
                }
                calculatedAmount = profileSnapshot.flatRate + (transactionAmount * (profileSnapshot.percentageRate / 100));
                appliedRules.push(`Hybrid Model: ${profileSnapshot.flatRate} + ${profileSnapshot.percentageRate}%`);
                break;
            default:
                throw new Error(`Unsupported commission model: ${profileSnapshot.modelType}`);
        }
        // Apply cap if defined
        if (profileSnapshot.cappedAmount !== undefined && calculatedAmount > profileSnapshot.cappedAmount) {
            calculatedAmount = profileSnapshot.cappedAmount;
            appliedRules.push(`Capped at: ${profileSnapshot.cappedAmount}`);
        }
        // TODO: Call FinancialRuleEngine to validate transactionType eligibility for commissions
        return {
            amount: calculatedAmount,
            snapshotVersion: profileSnapshot.version,
            appliedRules,
        };
    }
    /**
     * Retrieves the historically correct commission profile snapshot for a given point in time
     * or a specific version ID. Ensures rollback and replay safety.
     */
    getSnapshotVersion(versionId) {
        // TODO: Fetch immutable snapshot from database using versionId
        // Mocking for now:
        return {
            version: versionId,
            modelType: CommissionModelType.PERCENTAGE,
            percentageRate: 10,
        };
    }
}
exports.CommissionResolutionEngine = CommissionResolutionEngine;
//# sourceMappingURL=CommissionResolutionEngine.js.map