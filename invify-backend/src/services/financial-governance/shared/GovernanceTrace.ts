import { GovernancePolicy } from './GovernancePolicy';

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

export class GovernanceTraceBuilder {
  private steps: GovernanceTraceStep[] = [];
  private seq = 0;
  private readonly startedAt = new Date().toISOString();
  private readonly startMs  = performance.now();

  constructor(private readonly correlationId: string) {}

  step(
    policyType: string,
    policyId: string | null,
    policyVersion: number | null,
    status: TraceStepStatus,
    message: string
  ): void {
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

  build(): GovernanceTrace {
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
