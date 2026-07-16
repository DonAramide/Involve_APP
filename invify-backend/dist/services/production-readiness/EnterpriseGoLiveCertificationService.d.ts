import { RuntimeEvidence } from '../runtime-evidence/RuntimeEvidence';
export type ReadinessLevel = 'NOT_READY' | 'CONDITIONALLY_READY' | 'PILOT_READY' | 'PRODUCTION_READY' | 'GO_LIVE_APPROVED' | 'GO_LIVE_APPROVED_AUDIT_GRADE_V1';
export interface AuditGoLiveCertificate {
    certificateId: string;
    readinessLevel: ReadinessLevel;
    overallScore: number;
    evidences: RuntimeEvidence[];
    certifiedAt: string;
}
export declare class EnterpriseGoLiveCertificationService {
    private static artifactDir;
    static executeValidationSuite(): AuditGoLiveCertificate;
    private static writeReport;
    private static registerLiveProviders;
    private static generateEvidenceBlock;
    private static generateReport;
    private static generateGoLiveCertificationReport;
    private static generateAuditRuntimeEvidenceReport;
    private static generateGoLiveChecklist;
}
