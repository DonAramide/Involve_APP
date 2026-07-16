import { ArchitectureLayer, DomainStatus } from './ProductionReadinessTypes';
export interface ArchitectureReport {
    reportId: string;
    generatedAt: string;
    title: string;
    description: string;
    layers: ArchitectureLayer[];
    serviceCount: number;
    certifiedLayers: number;
    overallStatus: DomainStatus;
}
export declare class ArchitectureReportService {
    static generate(): ArchitectureReport;
}
