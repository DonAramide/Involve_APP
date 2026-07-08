export type EvidenceConfidence = 'LIVE' | 'LIVE_CACHE' | 'CONFIG' | 'SIMULATION' | 'UNKNOWN';

export interface RuntimeEvidence {
  evidenceId: string;
  gate: string;
  collector: string;
  source: 'POSTGRES' | 'REDIS' | 'NODE_RUNTIME' | 'DOCKER' | 'VAULT' | 'QUEUE_ENGINE' | 'PROMETHEUS' | 'OPENTELEMETRY' | 'BANKING_GATEWAY' | 'QUASAR' | 'TREASURY' | 'RISK' | 'OBSERVABILITY' | 'RECONCILIATION';
  collectedAt: string;
  durationMs: number;
  confidence: EvidenceConfidence;
  status: 'PASS' | 'FAIL' | 'UNAVAILABLE';
  rawData: any;
  normalizedData: any;
  validationResult: boolean;
  errors: string[];
  warnings: string[];
  correlationId: string;
  previousHash?: string;
  hash?: string;
}
