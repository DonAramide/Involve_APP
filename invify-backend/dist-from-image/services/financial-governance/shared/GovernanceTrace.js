"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceTraceBuilder = void 0;
class GovernanceTraceBuilder {
    correlationId;
    steps = [];
    seq = 0;
    startedAt = new Date().toISOString();
    startMs = performance.now();
    constructor(correlationId) {
        this.correlationId = correlationId;
    }
    step(policyType, policyId, policyVersion, status, message) {
        this.steps.push({
            seq: ++this.seq,
            policyType,
            policyId,
            policyVersion,
            status,
            message,
            evaluatedAt: new Date().toISOString(),
        });
    }
    build() {
        const completedAt = new Date().toISOString();
        return {
            correlationId: this.correlationId,
            steps: this.steps,
            totalPoliciesEvaluated: this.steps.length,
            startedAt: this.startedAt,
            completedAt,
            durationMs: parseFloat((performance.now() - this.startMs).toFixed(3)),
        };
    }
}
exports.GovernanceTraceBuilder = GovernanceTraceBuilder;
//# sourceMappingURL=GovernanceTrace.js.map