import { FeeOrchestrator } from '../modules/fee-orchestration/FeeOrchestrator';
import { AssessResult } from '../modules/fee-orchestration/types';
export declare const FEE_SHADOW_SOURCE_POS = "invify.pos";
export declare const FEE_SHADOW_SOURCE_VA = "invify.va";
export declare function nairaToKobo(amountNaira: number): number;
/**
 * Deterministic POS fee idempotency key derived only from transaction identity
 * that is identical across retries and delayed callbacks:
 *   1. terminal-scoped client reference (when the device supplies one)
 *   2. RRN + STAN
 * Returns null when neither exists. Server-generated ids (txId) are random per
 * call and must never be used here.
 */
export declare function posShadowIdempotencyKey(params: {
    tenantId: string;
    rrn?: string | null;
    stan?: string | null;
    terminalId?: string | null;
    clientReference?: string | null;
    txId?: string;
}): string | null;
export declare function vaShadowIdempotencyKey(reference: string): string;
export type FeeShadowReport = {
    status: 'ASSESSED' | 'IDEMPOTENT_REPLAY' | 'NO_PROFILE' | 'SHADOW_FAILED' | 'SKIPPED';
    skip_reason?: string;
    live_enqueued?: boolean;
    live_posted?: boolean;
    needs_attention?: boolean;
    transaction_type: string;
    source_system: string;
    source_idempotency_key: string;
    transaction_amount_kobo: number | null;
    profile_id: string | null;
    profile_version_id: string | null;
    override_version_id: string | null;
    calculated_fee_kobo: number | null;
    final_fee_kobo: number | null;
    platform_amount_kobo: number | null;
    processor_amount_kobo: number | null;
    service_amount_kobo: number | null;
    agent_amount_kobo: number | null;
    legacy_fee_independently_calculated: boolean;
    compared_existing_fee_kobo: number | null;
    compare_delta_kobo: number | null;
    error?: string;
};
export declare function buildFeeShadowReport(result: AssessResult | {
    status: 'SHADOW_FAILED';
    error: string;
} | {
    status: 'SKIPPED';
    reason?: string;
}, extras?: {
    legacyFeeKobo?: number | null;
}): FeeShadowReport;
/** Read-only estimate from tenant_fee_profiles VA inward columns. Never writes. */
export declare function estimateLegacyVaInwardFeeKobo(transactionAmountKobo: number, profile: {
    transfer_inward_fee_bps?: number | null;
    transfer_inward_fee_cap?: number | null;
} | null): number | null;
export declare function setFeeShadowTestOrchestrator(orchestrator: InstanceType<typeof FeeOrchestrator> | null): void;
export declare class FeeShadowIntegration {
    static assessPosWithdrawalSafely(params: {
        tenantId: string;
        amountNaira: number;
        rrn?: string | null;
        stan?: string | null;
        terminalId?: string | null;
        clientReference?: string | null;
        txId: string;
        eventTime?: Date;
    }): Promise<FeeShadowReport>;
    static assessVaInwardSafely(params: {
        tenantId: string;
        amountNaira: number;
        reference: string;
        eventTime?: Date;
    }): Promise<FeeShadowReport>;
    static isPosApproved(response: {
        paymentSuccess?: boolean;
        statusCode?: string;
    } | null | undefined): boolean;
    static shouldAssessVaInward(input?: {
        status?: string;
        event?: string;
        type?: string;
    }): boolean;
    static afterPosResult<T extends {
        paymentSuccess?: boolean;
        statusCode?: string;
    }>(response: T, params: {
        tenantId: string;
        amountNaira: number;
        rrn?: string | null;
        stan?: string | null;
        terminalId?: string | null;
        clientReference?: string | null;
        txId: string;
    }): Promise<T>;
    static afterVaInwardResult(success: boolean, params: {
        tenantId: string;
        amountNaira: number;
        reference: string;
        eventTime?: Date;
    }): Promise<FeeShadowReport | {
        status: "SKIPPED";
    }>;
}
