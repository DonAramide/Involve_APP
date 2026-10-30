import { DomainCertification, DomainStatus, ReleaseTag } from './ProductionReadinessTypes';
export interface FullProductionReadinessReport {
    reportId: string;
    generatedAt: string;
    platform: string;
    version: string;
    overallStatus: DomainStatus;
    productionReadinessScore: number;
    domains: DomainCertification[];
    releaseTag: ReleaseTag;
    executiveSummary: string;
}
export declare class ProductionReadinessCertifier {
    /**
     * Aggregates domain certifications into the top-level production-readiness report
     * and stamps the release tag.
     *
     * Domain scores are weighted:
     *   Security    30%
     *   Queues      15%
     *   Recovery    15%
     *   Observability 10%
     *   Certificates  10%
     *   Vault         10%
     *   Performance   10%
     */
    static generate(domains: DomainCertification[]): FullProductionReadinessReport;
}
