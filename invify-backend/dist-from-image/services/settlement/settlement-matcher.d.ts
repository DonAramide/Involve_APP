import { NormalizedSettlementRow } from './settlement-template.types';
export interface MatchablePosAttempt {
    id: string;
    tenant_id: string;
    terminal_id: string | null;
    amount: number;
    status: string;
    settlement_status: string | null;
    rrn: string | null;
    stan: string | null;
    auth_code: string | null;
}
export declare function normalizeDbRrn(value: string | null | undefined): string | null;
export declare function normalizeDbStan(value: string | null | undefined): string | null;
export declare function normalizeDbTerminal(value: string | null | undefined): string | null;
export declare function amountsClose(a: number, b: number, tolerance?: number): boolean;
export declare function amountCandidates(amount: number): number[];
export declare function scoreSettlementMatch(row: NormalizedSettlementRow, attempt: MatchablePosAttempt): number;
export declare function buildSettlementMatchReason(row: NormalizedSettlementRow, attempt: MatchablePosAttempt): string;
