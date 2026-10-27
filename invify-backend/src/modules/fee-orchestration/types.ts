export type FeeTransactionType =
  | 'POS_WITHDRAWAL'
  | 'VIRTUAL_ACCOUNT_INWARD_TRANSFER'
  | 'TREASURY_WITHDRAWAL'
  | 'TREASURY_TRANSFER'
  | 'SMS'
  | 'AI_TASK';

export type FeeCalcMethod = 'FLAT' | 'PERCENTAGE' | 'HYBRID';
export type FeeVersionStatus = 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
export type FeeComponent = 'PLATFORM' | 'PROCESSOR' | 'SERVICE' | 'AGENT_FEE';
export type FeeAssessmentMode = 'SHADOW' | 'LIVE';
export type FeeAssessmentKind = 'ASSESSMENT' | 'REVERSAL';

export const REQUIRED_SPLIT_BPS = 10000;

export interface FeeShareBps {
  platform_bps: number;
  processor_bps: number;
  service_bps: number;
  agent_bps: number;
}

export interface FeeShareAmounts {
  platform_amount_kobo: number;
  processor_amount_kobo: number;
  service_amount_kobo: number;
  agent_amount_kobo: number;
}

export interface PublishedFeeVersion {
  profile_id: string;
  profile_version_id: string;
  override_version_id: string | null;
  transaction_type: FeeTransactionType;
  status: FeeVersionStatus;
  method: FeeCalcMethod;
  percentage_bps: number;
  flat_amount_kobo: number;
  min_fee_kobo: number;
  max_fee_kobo: number;
  platform_bps: number;
  processor_bps: number;
  service_bps: number;
  agent_bps: number;
  effective_from: Date;
  effective_to: Date | null;
  source: 'TENANT_OVERRIDE' | 'GLOBAL_PROFILE' | 'AGENT_PROFILE';
  tenant_id: string | null;
  agent_id?: string | null;
}

export interface FeeCalculationBreakdown {
  calculated_fee_kobo: number;
  min_applied_kobo: number;
  cap_applied_kobo: number;
  final_fee_kobo: number;
}

export interface FeeAssessmentSnapshot extends FeeShareBps, FeeShareAmounts {
  id: string;
  mode: FeeAssessmentMode;
  kind: FeeAssessmentKind;
  transaction_type: FeeTransactionType;
  source_system: string;
  source_idempotency_key: string;
  transaction_reference: string;
  tenant_id: string;
  agent_id?: string | null;
  resolved_source?: 'AGENT_PROFILE' | 'GLOBAL_FALLBACK' | null;
  profile_id: string;
  profile_version_id: string;
  override_version_id: string | null;
  method: FeeCalcMethod;
  transaction_amount_kobo: number;
  percentage_bps: number;
  flat_amount_kobo: number;
  min_fee_kobo: number;
  max_fee_kobo: number;
  calculated_fee_kobo: number;
  min_applied_kobo: number;
  cap_applied_kobo: number;
  final_fee_kobo: number;
}

export interface FeeAssessmentLine {
  component: FeeComponent;
  amount_kobo: number;
  percent_bps: number;
  ledger_entry_id: null;
}

export type ResolveResult =
  | { status: 'RESOLVED'; version: PublishedFeeVersion }
  | { status: 'NO_PROFILE' };

export type AssessRequest = {
  transactionType: FeeTransactionType;
  tenantId: string;
  agentId?: string | null;
  transactionAmountKobo: number;
  eventTime: Date;
  sourceSystem: string;
  sourceIdempotencyKey: string;
  transactionReference: string;
  mode?: FeeAssessmentMode;
};

export type AssessResult =
  | { status: 'ASSESSED'; snapshot: FeeAssessmentSnapshot; lines: FeeAssessmentLine[]; replayed: false }
  | { status: 'IDEMPOTENT_REPLAY'; snapshot: FeeAssessmentSnapshot; lines: FeeAssessmentLine[]; replayed: true }
  | { status: 'NO_PROFILE' };

export class FeeOrchestrationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'FeeOrchestrationError';
  }
}

export interface FeeProfileCatalog {
  listCandidateVersions(
    transactionType: FeeTransactionType,
    tenantId: string,
    agentId?: string | null,
  ): Promise<PublishedFeeVersion[]>;
}

export interface FeeAssessmentStore {
  findByIdempotency(
    sourceSystem: string,
    sourceIdempotencyKey: string,
  ): Promise<{ snapshot: FeeAssessmentSnapshot; lines: FeeAssessmentLine[] } | null>;
  insert(
    snapshot: FeeAssessmentSnapshot,
    lines: FeeAssessmentLine[],
  ): Promise<{ snapshot: FeeAssessmentSnapshot; lines: FeeAssessmentLine[] }>;
}
