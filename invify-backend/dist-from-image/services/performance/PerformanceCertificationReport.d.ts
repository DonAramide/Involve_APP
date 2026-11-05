import { ThroughputResult, ConcurrencyResult, LoadTestResult, StressResult } from './BenchmarkTypes';
export type GateStatus = 'PASS' | 'FAIL';
export interface CertificationGate {
    id: string;
    description: string;
    measured: string;
    threshold: string;
    status: GateStatus;
}
export interface PerformanceCertification {
    capturedAt: string;
    durationMs: number;
    certificationScore: number;
    certificationPassed: boolean;
    gates: CertificationGate[];
    summary: {
        queueThroughput: ThroughputResult;
        webhookThroughput: ThroughputResult;
        transferThroughput: ThroughputResult;
        concurrency: ConcurrencyResult;
        loadTest: LoadTestResult;
        stress: StressResult;
    };
}
export declare class PerformanceCertificationReport {
    static build(startedAt: number, queue: ThroughputResult, webhook: ThroughputResult, transfer: ThroughputResult, conc: ConcurrencyResult, load: LoadTestResult, stress: StressResult): PerformanceCertification;
}
