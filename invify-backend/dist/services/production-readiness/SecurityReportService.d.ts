import { DomainStatus } from './ProductionReadinessTypes';
export interface SecurityReportSection {
    name: string;
    status: DomainStatus;
    score: number;
    details: string;
}
export interface SecurityReport {
    reportId: string;
    generatedAt: string;
    overallSecurityScore: number;
    overallStatus: DomainStatus;
    sections: SecurityReportSection[];
    complianceSummary: {
        PCI_DSS: number;
        SOC2: number;
        ISO27001: number;
        overall: number;
    };
    auditEventCount: number;
    criticalEventsCount: number;
    postureScore: number;
    postureStatus: string;
}
export declare class SecurityReportService {
    static generate(): SecurityReport;
}
