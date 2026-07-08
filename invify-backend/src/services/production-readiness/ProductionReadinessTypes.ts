// ─── Shared types for all Phase 3.10 production-readiness reports ─────────────

export type DomainStatus = 'CERTIFIED' | 'DEGRADED' | 'FAILED';

export interface DomainCertification {
  domain: string;
  status: DomainStatus;
  score: number;        // 0–100
  controls: string[];   // passing control descriptions
  issues: string[];     // failing / advisory items
}

export interface ArchitectureLayer {
  layer: string;
  services: string[];
  status: DomainStatus;
  note: string;
}

export interface ReleaseTag {
  tag: string;                        // e.g. 'BANKING_PRODUCTION_READY_V1'
  certificationDate: string;
  certificationScore: number;
  domains: Record<string, DomainStatus>;
  issuer: string;
  sha: string;                        // deterministic content hash of the tag
}

export interface ProductionReport {
  reportId: string;
  generatedAt: string;
  platform: string;
  version: string;
  overallStatus: DomainStatus;
  productionReadinessScore: number;   // weighted average of all domain scores
  domains: DomainCertification[];
  releaseTag: ReleaseTag | null;
  architecture: ArchitectureLayer[];
  summary: string;
}
