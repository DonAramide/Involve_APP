"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentGovernanceValidationRunner = void 0;
const ReferralLineageEngine_1 = require("../../distribution-lineage/ReferralLineageEngine");
const CommissionLineageEngine_1 = require("../../distribution-lineage/CommissionLineageEngine");
const CommissionResolutionEngine_1 = require("../../commission-models/CommissionResolutionEngine");
const AgentIntegrityGuardian_1 = require("./AgentIntegrityGuardian");
class AgentGovernanceValidationRunner {
    referralEngine = new ReferralLineageEngine_1.ReferralLineageEngine();
    commLineageEngine = new CommissionLineageEngine_1.CommissionLineageEngine();
    commResolutionEngine = new CommissionResolutionEngine_1.CommissionResolutionEngine();
    guardian = new AgentIntegrityGuardian_1.AgentIntegrityGuardian();
    /**
     * Runs the complete enterprise validation suite for Agent Governance
     */
    async runValidationSuites() {
        console.log('--- STARTING AGENT GOVERNANCE VALIDATION SUITES ---');
        this.validateImmutableLineage();
        this.validateDeterministicCommissionReplay();
        this.validateFraudSuppression();
        console.log('--- VALIDATION SUITES COMPLETED SUCCESSFULLY ---');
    }
    validateImmutableLineage() {
        console.log('Running: Immutable Lineage Validation...');
        const record = this.referralEngine.initializeOnboardingLineage('tenant-123', 'RET102', 'ONLINE', 'MOBILE_APP', 'direct');
        if (!record.attributionLineageHash)
            throw new Error('Lineage Hash missing!');
        console.log('✔ Immutable Lineage validated.');
    }
    validateDeterministicCommissionReplay() {
        console.log('Running: Deterministic Commission Replay Validation...');
        const snapshot = {
            version: 'v1',
            modelType: CommissionResolutionEngine_1.CommissionModelType.PERCENTAGE,
            percentageRate: 10
        };
        const resolution = this.commResolutionEngine.resolveCommission(500, 'SUBSCRIPTION', snapshot);
        if (resolution.amount !== 50)
            throw new Error('Commission calculation failed determinism check');
        const lineage = this.commLineageEngine.recordCommissionLineage('tx-789', 1, snapshot.version, resolution.amount, 'RET102');
        if (!lineage.lineageHash)
            throw new Error('Commission Lineage Hash missing!');
        console.log('✔ Deterministic Commission Replay validated.');
    }
    validateFraudSuppression() {
        console.log('Running: Fraud Suppression Validation...');
        const isVelocityAnomaly = this.guardian.evaluateVelocityAnomaly('RET102', 60);
        if (!isVelocityAnomaly)
            throw new Error('Velocity limiter failed to trigger');
        const isGeoInconsistent = this.guardian.detectGeographicInconsistency('RET102', 'Lagos', 'London');
        if (!isGeoInconsistent)
            throw new Error('Geo anomaly failed to trigger');
        console.log('✔ Fraud Suppression validated.');
    }
}
exports.AgentGovernanceValidationRunner = AgentGovernanceValidationRunner;
//# sourceMappingURL=AgentGovernanceValidationRunner.js.map