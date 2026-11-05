import { MemoryFeeAssessmentStore } from '../modules/fee-orchestration/stores/MemoryFeeAssessmentStore';
import { FeeProfileCatalog, PublishedFeeVersion } from '../modules/fee-orchestration/types';
export declare class TreasuryQuoteError extends Error {
    readonly code: string;
    readonly payload: Record<string, unknown>;
    constructor(message: string, code: string, payload?: Record<string, unknown>);
}
export type TreasuryQuote = {
    transaction_type: 'TREASURY_WITHDRAWAL';
    requested_amount: number;
    service_fee: number;
    total_required: number;
    available_balance: number;
    remaining_balance: number | null;
    shortfall: number;
    sufficient: boolean;
    fee_profile_version_id: string | null;
    fee_profile_id: string | null;
    service_fee_kobo: number;
    requested_amount_kobo: number;
};
export declare class TreasuryFeeService {
    static testCatalog: FeeProfileCatalog | null;
    static testAssessmentStore: MemoryFeeAssessmentStore | null;
    static quote(tenantId: string, requestedAmount: number): Promise<TreasuryQuote>;
    static resolve(tenantId: string): Promise<PublishedFeeVersion | null>;
    static feeCreditEntriesNaira(version: PublishedFeeVersion, serviceFeeNaira: number): ({
        account: "PLATFORM_FEE";
        type: "CREDIT";
        amount: number;
    } | {
        account: "PROCESSOR_FEE";
        type: "CREDIT";
        amount: number;
    } | {
        account: "SERVICE_FEE";
        type: "CREDIT";
        amount: number;
    } | {
        account: "AGENT_FEE";
        type: "CREDIT";
        amount: number;
    })[];
    static persistAssessment(params: {
        tenantId: string;
        reference: string;
        requestedAmount: number;
        version: PublishedFeeVersion;
    }): Promise<void>;
}
