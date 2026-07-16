export type TraceStepStatus = 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
export interface GovernanceTraceStep {
    seq: number;
    policyType: string;
    policyId: string | null;
    policyVersion: number | null;
    status: TraceStepStatus;
    message: string;
    evaluatedAt: string;
}
export interface GovernanceTrace {
    correlationId: string;
    steps: GovernanceTraceStep[];
    totalPoliciesEvaluated: number;
    startedAt: string;
    completedAt: string;
    durationMs: number;
}
export declare class GovernanceTraceBuilder {
    private readonly correlationId;
    private steps;
    private seq;
    private readonly startedAt;
    private readonly startMs;
    constructor(correlationId: string);
    step(policyType: string, policyId: string | null, policyVersion: number | null, status: TraceStepStatus, message: string): void;
    build(): GovernanceTrace;
}
