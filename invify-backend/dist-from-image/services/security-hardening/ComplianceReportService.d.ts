export type ComplianceFramework = 'PCI_DSS' | 'SOC2' | 'ISO27001';
export interface ComplianceControl {
    controlId: string;
    description: string;
    passed: boolean;
    evidence: string;
}
export interface ComplianceReport {
    framework: ComplianceFramework;
    /** Percentage of controls passing: 0–100 */
    score: number;
    passed: ComplianceControl[];
    failed: ComplianceControl[];
    capturedAt: string;
}
export interface ComplianceSnapshot {
    PCI_DSS: ComplianceReport;
    SOC2: ComplianceReport;
    ISO27001: ComplianceReport;
    /** Weighted average of all three framework scores */
    overallComplianceScore: number;
}
export declare class ComplianceReportService {
    /**
     * Generates a PCI-DSS compliance report by checking active security controls.
     */
    static generatePCIDSS(): ComplianceReport;
    /**
     * Generates a SOC2 compliance report.
     */
    static generateSOC2(): ComplianceReport;
    /**
     * Generates an ISO 27001 compliance report.
     * Extends PCI-DSS + SOC2 with additional certificate management control
     * (bridging Phase 3.2 CertificateRegistry).
     */
    static generateISO27001(): ComplianceReport;
    /**
     * Returns a full compliance snapshot across all three frameworks.
     */
    static getComplianceSnapshot(): ComplianceSnapshot;
    private static buildReport;
}
