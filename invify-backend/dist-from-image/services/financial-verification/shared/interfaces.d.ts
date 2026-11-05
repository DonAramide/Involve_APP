import { VerificationContext } from "./VerificationContext";
export type VerificationDomainType = 'Banking' | 'Treasury' | 'Settlement' | 'Wallet' | 'Risk' | 'Reconciliation';
export type VerificationPolicyType = 'WITHDRAWAL' | 'PAYOUT' | 'REFUND' | 'INBOUND';
export interface FinancialVerificationModule {
    moduleId: string;
    domain: VerificationDomainType;
    priority: number;
    mandatory: boolean;
    version: string;
    capabilities: string[];
    verify(context: VerificationContext): Promise<VerificationResult>;
}
export interface VerificationResult {
    passed: boolean;
    error?: string;
    warning?: string;
    metrics?: {
        dbQueries?: number;
        externalCalls?: number;
        cacheHits?: number;
        warnings?: string[];
    };
}
export interface ModuleVersionInfo {
    module: string;
    version: string;
}
export interface VerificationVerdict {
    verificationId: string;
    correlationId: string;
    timestamp: string;
    passed: boolean;
    decision: 'ALLOW' | 'REJECT' | 'ESCALATE' | 'MANUAL_REVIEW';
    severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
    riskScore: number;
    executedChecks: string[];
    warnings: string[];
    errors: string[];
    verificationVersion: string;
    policyVersion: string;
    modules: ModuleVersionInfo[];
}
export interface VerificationTraceEntry {
    order: number;
    moduleName: string;
    durationMs: number;
    outcome: 'PASSED' | 'FAILED' | 'SKIPPED';
    failureReason?: string;
    recommendation?: string;
}
export interface VerificationTrace {
    traceId: string;
    correlationId: string;
    timestamp: string;
    entries: VerificationTraceEntry[];
    decision: 'ALLOW' | 'REJECT' | 'ESCALATE' | 'MANUAL_REVIEW';
}
