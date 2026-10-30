import { FeeAssessmentMode, FeeShareAmounts } from '../modules/fee-orchestration/types';
import { LedgerEntry } from './ledger.service';
export declare class FeeLedgerPostingError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare function feeAssessIdempotencyKey(assessmentId: string): string;
export declare function feeReverseIdempotencyKey(reversalId: string): string;
export interface FeeComponentAmounts {
    platform_amount_kobo: number;
    processor_amount_kobo: number;
    service_amount_kobo: number;
    agent_amount_kobo: number;
}
export declare function assertLedgerBundleBalanced(entries: LedgerEntry[]): void;
/**
 * Live bundle (not executed in shadow):
 * DEBIT USER_WALLET final_fee
 * CREDIT PLATFORM_FEE / PROCESSOR_FEE / SERVICE_FEE / AGENT_FEE
 * PROCESSOR_FEE is a payable, not platform revenue.
 */
export declare function buildFeeAssessmentBundle(amounts: FeeComponentAmounts): LedgerEntry[];
/**
 * Proportional component reversal: refund_fee = trunc(original_final * refunded_txn / original_txn),
 * then largest-remainder across original component weights so shares keep proportion.
 */
export declare function reverseFeeComponents(params: {
    original: FeeComponentAmounts;
    originalTransactionAmountKobo: number;
    refundedTransactionAmountKobo: number;
}): FeeShareAmounts;
/**
 * Opposite of the live assessment bundle: CREDIT USER_WALLET, DEBIT each fee account.
 */
export declare function buildFeeReversalBundle(amounts: FeeComponentAmounts): LedgerEntry[];
/** Deterministic rejections raised by the guarded fee RPCs. Never retried by the outbox. */
export declare const PERMANENT_FEE_POSTING_CODES: readonly ["INSUFFICIENT_BALANCE", "FEE_DEBIT_INVALID_KEY", "FEE_DEBIT_INVALID_BUNDLE", "FEE_DEBIT_WALLET_NOT_FOUND", "FEE_REVERSAL_INVALID_KEY", "FEE_REVERSAL_INVALID_BUNDLE", "FEE_REVERSAL_WALLET_NOT_FOUND", "FEE_REVERSAL_ORIGINAL_NOT_POSTED", "FEE_REVERSAL_EXCEEDS_ORIGINAL"];
export declare function mapGuardedRpcError(error: {
    message?: string;
} | null | undefined): FeeLedgerPostingError;
export type FeePostingResult = {
    status: 'SKIPPED_ZERO';
} | {
    status: 'CREATED';
    ledgerId: string | null;
    idempotencyKey: string;
} | {
    status: 'DE-DUPLICATED';
    ledgerId: string | null;
    idempotencyKey: string;
};
type GuardedRpc = (fn: string, args: Record<string, unknown>) => Promise<{
    data: any;
    error: any;
}>;
/** Test seam: route guarded RPCs to a local database harness. */
export declare function setFeeLedgerRpcForTests(rpc: GuardedRpc | null): void;
/**
 * Capability-only poster. Not wired into FeeOrchestrator or any money path.
 * Runs only if mode=LIVE and FEE_ORCHESTRATION_LIVE=true, and only through the
 * guarded RPCs (post_fee_debit_guarded / post_fee_reversal_guarded).
 */
export declare class FeeLedgerPoster {
    static readonly accountNature: Record<"PLATFORM_FEE" | "PROCESSOR_FEE" | "SERVICE_FEE" | "AGENT_FEE", "PLATFORM_REVENUE" | "PROCESSOR_PAYABLE" | "SERVICE_COST" | "AGENT_PAYABLE">;
    static readonly feeAccounts: readonly ["PLATFORM_FEE", "PROCESSOR_FEE", "SERVICE_FEE", "AGENT_FEE"];
    static postAssessment(params: {
        mode: FeeAssessmentMode;
        assessmentId: string;
        tenantId: string;
        reference: string;
        amounts: FeeComponentAmounts;
    }): Promise<FeePostingResult>;
    static postReversal(params: {
        mode: FeeAssessmentMode;
        reversalId: string;
        assessmentId: string;
        tenantId: string;
        reference: string;
        amounts: FeeComponentAmounts;
    }): Promise<FeePostingResult>;
}
export {};
