import { supabaseAdmin } from '../db/supabase';
import { ActorContext, DistributionFilters, FeeSettlementRecord, FeeStakeholderRecord, FeeWithdrawalRecord } from '../modules/fee-orchestration/FeeDistributionEngine';
export declare class PlatformFeeDistributionService {
    private readonly db;
    constructor(db?: Pick<typeof supabaseAdmin, 'from'>);
    private loadStore;
    private persistNewStakeholders;
    private persistNewPayables;
    private persistEvent;
    distribution(filters?: DistributionFilters): Promise<{
        agent_id: string | null;
        total_fee_calculated: {
            amount_kobo: number;
            display: string;
        };
        total_final_customer_fee: {
            amount_kobo: number;
            display: string;
        };
        components: {
            PLATFORM: {
                amount_kobo: number;
                display: string;
                allocation_kobo: number;
                label: string;
            };
            PROCESSOR: {
                amount_kobo: number;
                display: string;
                allocation_kobo: number;
                label: string;
            };
            SERVICE: {
                amount_kobo: number;
                display: string;
                allocation_kobo: number;
                label: string;
            };
            AGENT: {
                amount_kobo: number;
                display: string;
                allocation_kobo: number;
                label: string;
            };
        };
        stakeholders: {
            allocation: {
                amount_kobo: number;
                display: string;
            };
            earned: {
                amount_kobo: number;
                display: string;
            };
            pending: {
                amount_kobo: number;
                display: string;
            };
            available: {
                amount_kobo: number;
                display: string;
            };
            settled: {
                amount_kobo: number;
                display: string;
            };
            stakeholder_id: string | null;
            stakeholder_type: "PLATFORM" | "PROCESSOR" | "SERVICE" | "AGENT";
            display_name: string;
            label: string;
            allocation_kobo: number;
            earned_kobo: number;
            pending_kobo: number;
            available_kobo: number;
            settled_kobo: number;
            reservation_kobo: number;
            assessment_count: number;
            individual_agent_count: number;
        }[];
        recent_activity: {
            amount: {
                amount_kobo: number;
                display: string;
            };
            id: string;
            stakeholder_id: string;
            assessment_id: string;
            assessment_line_id: string;
            component: string;
            amount_kobo: number;
            status: import("../modules/fee-orchestration/FeeDistributionEngine").FeePayableStatus;
            created_at: string;
            available_at: string | null;
            settled_at: string | null;
            settlement_id: string | null;
            agent_id?: string | null;
        }[];
        fee_mode: string;
        control_plane_only: boolean;
        payout_execution_enabled: boolean;
        terminology: {
            note: string;
            total_assessed: string;
            final_assessed_fees: string;
            platform: string;
            processor: string;
            service: string;
            agent: string;
        };
        total_assessments: number;
        total_fee_calculated_kobo: number;
        total_final_customer_fee_kobo: number;
        total_distributed_kobo: number;
        matches_final_fee: boolean;
        transaction_types_with_activity: {
            transaction_type: string;
            count: number;
        }[];
        filtered_assessment_ids: string[];
    }>;
    agentCommission(agentIdRaw: string): Promise<{
        agent_id: string;
        agent_code: any;
        assessed_kobo: number;
        pending_kobo: number;
        available_kobo: number;
        mode: string;
        payout_execution_enabled: boolean;
        assessments: {
            id: string;
            tenant_id: string | null;
            agent_id: string | null | undefined;
            transaction_type: string;
            final_fee_kobo: number;
            agent_share_kobo: number;
            mode: string;
            status: string;
            created_at: string;
        }[];
    }>;
    listStakeholders(agentIdRaw?: string): Promise<{
        earned: {
            amount_kobo: number;
            display: string;
        };
        pending: {
            amount_kobo: number;
            display: string;
        };
        available: {
            amount_kobo: number;
            display: string;
        };
        settled: {
            amount_kobo: number;
            display: string;
        };
        earned_kobo: number;
        pending_kobo: number;
        available_kobo: number;
        settled_kobo: number;
        reservation_kobo: number;
        assessment_count: number;
        agent_id: {} | null;
        label: string;
        id: string;
        stakeholder_type: import("../modules/fee-orchestration/FeeDistributionEngine").FeeStakeholderType;
        display_name: string;
        status: import("../modules/fee-orchestration/FeeDistributionEngine").FeeStakeholderStatus;
        metadata: Record<string, unknown>;
        created_at: string;
        updated_at: string;
    }[]>;
    getStakeholder(id: string): Promise<{
        earned: {
            amount_kobo: number;
            display: string;
        };
        pending: {
            amount_kobo: number;
            display: string;
        };
        available: {
            amount_kobo: number;
            display: string;
        };
        settled: {
            amount_kobo: number;
            display: string;
        };
        history: {
            transaction_type: string | null;
            tenant_id: string | null;
            tenant_name: string | null;
            final_fee_kobo: number | null;
            amount: {
                amount_kobo: number;
                display: string;
            };
            settlement_id: string | null;
            id: string;
            stakeholder_id: string;
            assessment_id: string;
            assessment_line_id: string;
            component: string;
            amount_kobo: number;
            status: import("../modules/fee-orchestration/FeeDistributionEngine").FeePayableStatus;
            created_at: string;
            available_at: string | null;
            settled_at: string | null;
            agent_id?: string | null;
        }[];
        earned_kobo: number;
        pending_kobo: number;
        available_kobo: number;
        settled_kobo: number;
        reservation_kobo: number;
        assessment_count: number;
        label: string;
        id: string;
        stakeholder_type: import("../modules/fee-orchestration/FeeDistributionEngine").FeeStakeholderType;
        display_name: string;
        status: import("../modules/fee-orchestration/FeeDistributionEngine").FeeStakeholderStatus;
        metadata: Record<string, unknown>;
        created_at: string;
        updated_at: string;
    }>;
    listPayables(stakeholderId: string): Promise<{
        transaction_type: string | null;
        tenant_id: string | null;
        tenant_name: string | null;
        final_fee_kobo: number | null;
        amount: {
            amount_kobo: number;
            display: string;
        };
        settlement_id: string | null;
        id: string;
        stakeholder_id: string;
        assessment_id: string;
        assessment_line_id: string;
        component: string;
        amount_kobo: number;
        status: import("../modules/fee-orchestration/FeeDistributionEngine").FeePayableStatus;
        created_at: string;
        available_at: string | null;
        settled_at: string | null;
        agent_id?: string | null;
    }[]>;
    listSettlements(stakeholderId: string): Promise<{
        amount: {
            amount_kobo: number;
            display: string;
        };
        payout_executed: boolean;
        id: string;
        stakeholder_id: string;
        amount_kobo: number;
        status: import("../modules/fee-orchestration/FeeDistributionEngine").FeeSettlementStatus;
        settlement_reference: string | null;
        created_at: string;
        approved_at: string | null;
        processed_at: string | null;
        completed_at: string | null;
        failure_reason: string | null;
        metadata: Record<string, unknown>;
    }[]>;
    createStakeholder(input: any, actor: ActorContext): Promise<FeeStakeholderRecord>;
    updateStakeholder(id: string, patch: any, actor: ActorContext): Promise<FeeStakeholderRecord>;
    listWithdrawals(): Promise<{
        stakeholder_name: string;
        amount: {
            amount_kobo: number;
            display: string;
        };
        available_at_request: {
            amount_kobo: number;
            display: string;
        };
        payout_executed: boolean;
        id: string;
        stakeholder_id: string;
        amount_kobo: number;
        status: import("../modules/fee-orchestration/FeeDistributionEngine").FeeWithdrawalStatus;
        client_request_id: string;
        available_balance_kobo_at_request: number;
        settlement_id: string | null;
        requested_by: string | null;
        approved_by: string | null;
        created_at: string;
        approved_at: string | null;
        completed_at: string | null;
        failure_reason: string | null;
        metadata: Record<string, unknown>;
    }[]>;
    getWithdrawal(id: string): Promise<{
        stakeholder: FeeStakeholderRecord | undefined;
        amount: {
            amount_kobo: number;
            display: string;
        };
        available_at_request: {
            amount_kobo: number;
            display: string;
        };
        payout_executed: boolean;
        control_plane_only: boolean;
        audit_trail: import("../modules/fee-orchestration/FeeDistributionEngine").FeeDistributionEvent[];
        id: string;
        stakeholder_id: string;
        amount_kobo: number;
        status: import("../modules/fee-orchestration/FeeDistributionEngine").FeeWithdrawalStatus;
        client_request_id: string;
        available_balance_kobo_at_request: number;
        settlement_id: string | null;
        requested_by: string | null;
        approved_by: string | null;
        created_at: string;
        approved_at: string | null;
        completed_at: string | null;
        failure_reason: string | null;
        metadata: Record<string, unknown>;
    }>;
    createWithdrawal(input: any, actor: ActorContext): Promise<{
        id: any;
        stakeholder_id: string;
        amount_kobo: number;
        status: any;
        client_request_id: string;
        replayed: boolean;
        payout_executed: boolean;
    } | {
        replayed: boolean;
        payout_executed: boolean;
        id: string;
        stakeholder_id: string;
        amount_kobo: number;
        status: import("../modules/fee-orchestration/FeeDistributionEngine").FeeWithdrawalStatus;
        client_request_id: string;
        available_balance_kobo_at_request: number;
        settlement_id: string | null;
        requested_by: string | null;
        approved_by: string | null;
        created_at: string;
        approved_at: string | null;
        completed_at: string | null;
        failure_reason: string | null;
        metadata: Record<string, unknown>;
    }>;
    approveWithdrawal(id: string, actor: ActorContext): Promise<{
        payout_executed: boolean;
        withdrawal: FeeWithdrawalRecord;
        settlement: FeeSettlementRecord;
    }>;
    rejectWithdrawal(id: string, reason: string, actor: ActorContext): Promise<FeeWithdrawalRecord>;
    cancelWithdrawal(id: string, actor: ActorContext): Promise<FeeWithdrawalRecord>;
    approveSettlement(id: string, actor: ActorContext): Promise<{
        payout_executed: boolean;
        id: string;
        stakeholder_id: string;
        amount_kobo: number;
        status: import("../modules/fee-orchestration/FeeDistributionEngine").FeeSettlementStatus;
        settlement_reference: string | null;
        created_at: string;
        approved_at: string | null;
        processed_at: string | null;
        completed_at: string | null;
        failure_reason: string | null;
        metadata: Record<string, unknown>;
    }>;
    markSettlementProcessing(id: string, actor: ActorContext): Promise<{
        payout_executed: boolean;
        id: string;
        stakeholder_id: string;
        amount_kobo: number;
        status: import("../modules/fee-orchestration/FeeDistributionEngine").FeeSettlementStatus;
        settlement_reference: string | null;
        created_at: string;
        approved_at: string | null;
        processed_at: string | null;
        completed_at: string | null;
        failure_reason: string | null;
        metadata: Record<string, unknown>;
    }>;
    completeSettlement(): never;
    failSettlement(id: string, reason: string, actor: ActorContext): Promise<FeeSettlementRecord>;
}
export declare const platformFeeDistributionService: PlatformFeeDistributionService;
