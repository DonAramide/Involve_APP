export type DomainStatus = 'CERTIFIED' | 'DEGRADED' | 'FAILED';
export interface DomainCertification {
    domain: string;
    status: DomainStatus;
    score: number;
    controls: string[];
    issues: string[];
}
export interface ArchitectureLayer {
    layer: string;
    services: string[];
    status: DomainStatus;
    note: string;
}
export interface ReleaseTag {
    tag: string;
    certificationDate: string;
    certificationScore: number;
    domains: Record<string, DomainStatus>;
    issuer: string;
    sha: string;
}
export interface ProductionReport {
    reportId: string;
    generatedAt: string;
    platform: string;
    version: string;
    overallStatus: DomainStatus;
    productionReadinessScore: number;
    domains: DomainCertification[];
    releaseTag: ReleaseTag | null;
    architecture: ArchitectureLayer[];
    summary: string;
}
