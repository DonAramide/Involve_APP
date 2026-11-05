import { FeeAssessmentSnapshot } from '../modules/fee-orchestration/types';
import { buildFeeShadowReport, FeeShadowReport } from './fee-shadow-integration';
import { MemoryFeePostingOutboxStore, SupabaseFeePostingOutboxStore } from './fee-posting-outbox.stores';
/**
 * Posts the inbound VA fee as a separate USER_WALLET debit after gross credit.
 * Failures are parked on the outbox (NEEDS_ATTENTION); the gross credit is kept.
 */
export declare class InboundFeeService {
    static testOutboxStore: MemoryFeePostingOutboxStore | null;
    private static memoryStore;
    static store(): MemoryFeePostingOutboxStore | SupabaseFeePostingOutboxStore;
    static enqueueLiveAssessment(snapshot: FeeAssessmentSnapshot): Promise<{
        live_enqueued: boolean;
        live_posted: boolean;
        needs_attention: boolean;
    }>;
    static attachLiveFields(report: FeeShadowReport, extra: {
        live_enqueued?: boolean;
        live_posted?: boolean;
        needs_attention?: boolean;
    }): FeeShadowReport & typeof extra;
    static fromAssess(result: Parameters<typeof buildFeeShadowReport>[0], extra?: {
        live_enqueued?: boolean;
        live_posted?: boolean;
    }): {
        live_enqueued?: boolean;
        live_posted?: boolean;
        status: "ASSESSED" | "IDEMPOTENT_REPLAY" | "NO_PROFILE" | "SHADOW_FAILED" | "SKIPPED";
        skip_reason?: string;
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
}
