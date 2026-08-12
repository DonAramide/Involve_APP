export type SettlementTemplateType =
  | 'UPSL_T1_NIBSS'
  | 'ONEVIEW_T1_NIBSS'
  | 'NIBSS_REXCONNECT'
  | 'ONEVIEW_INSTANT'
  | 'ANP_CARD_WITHDRAWAL';

export interface SettlementTemplateMeta {
  id: SettlementTemplateType;
  label: string;
  description: string;
  processor: string;
  settlementTiming: 'T+1' | 'INSTANT' | 'VARIABLE';
}

export interface NormalizedSettlementRow {
  rowIndex: number;
  rrn: string | null;
  stan: string | null;
  terminalId: string | null;
  amount: number;
  authCode: string | null;
  settlementDate: string | null;
  processorRef: string | null;
  maskedPan: string | null;
  rawRow: Record<string, unknown>;
}

export interface SettlementMatchResult {
  row: NormalizedSettlementRow;
  posAttemptId: string | null;
  matchStatus: 'matched' | 'unmatched' | 'already_settled' | 'skipped';
  matchReason: string | null;
}

export interface SettlementUploadResult {
  batchId: string;
  dryRun: boolean;
  templateType: SettlementTemplateType;
  fileName: string;
  totalRows: number;
  matchedCount: number;
  unmatchedFileRows: number;
  alreadySettledCount: number;
  matches: SettlementMatchResult[];
}
