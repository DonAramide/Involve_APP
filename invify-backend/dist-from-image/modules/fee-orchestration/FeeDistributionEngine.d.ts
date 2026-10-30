import type { FeeTransactionType } from './types';
export declare const FEE_DISTRIBUTION_CONTROL_PLANE: "CONTROL_PLANE_ONLY";
export declare const SYSTEM_STAKEHOLDER_TYPES: readonly ["PLATFORM", "PROCESSOR", "SERVICE", "AGENT"];
export type FeeStakeholderType = (typeof SYSTEM_STAKEHOLDER_TYPES)[number];
export type FeeStakeholderStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type FeePayableStatus = 'PENDING' | 'AVAILABLE' | 'SETTLED' | 'REVERSED';
export type FeeSettlementStatus = 'REQUESTED' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'CANCELLED';
export type FeeWithdrawalStatus = FeeSettlementStatus;
export type FeeLineComponent = 'PLATFORM' | 'PROCESSOR' | 'SERVICE' | 'AGENT_FEE';
export declare class FeeDistributionError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(message: string, code: string, status?: number);
}
export declare function asKobo(value: unknown): number;
export declare function componentToStakeholderType(component: string): FeeStakeholderType;
export declare function natureLabel(type: FeeStakeholderType): string;
export interface FeeStakeholderRecord {
    id: string;
    stakeholder_type: FeeStakeholderType;
    display_name: string;
    status: FeeStakeholderStatus;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface FeePayableRecord {
    id: string;
    stakeholder_id: string;
    assessment_id: string;
    assessment_line_id: string;
    component: string;
    amount_kobo: number;
    status: FeePayableStatus;
    created_at: string;
    available_at: string | null;
    settled_at: string | null;
    settlement_id: string | null;
    agent_id?: string | null;
}
export interface FeeWithdrawalRecord {
    id: string;
    stakeholder_id: string;
    amount_kobo: number;
    status: FeeWithdrawalStatus;
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
}
export interface FeeSettlementRecord {
    id: string;
    stakeholder_id: string;
    amount_kobo: number;
    status: FeeSettlementStatus;
    settlement_reference: string | null;
    created_at: string;
    approved_at: string | null;
    processed_at: string | null;
    completed_at: string | null;
    failure_reason: string | null;
    metadata: Record<string, unknown>;
}
export interface FeeDistributionEvent {
    id: string;
    event_type: string;
    stakeholder_id: string | null;
    withdrawal_id: string | null;
    settlement_id: string | null;
    actor_id: string | null;
    actor_email: string | null;
    payload: Record<string, unknown>;
    created_at: string;
}
export interface AssessmentRow {
    id: string;
    tenant_id: string | null;
    agent_id?: string | null;
    transaction_type: FeeTransactionType | string;
    mode: string;
    kind: string;
    created_at: string;
    calculated_fee_kobo: number;
    final_fee_kobo: number;
    platform_amount_kobo: number;
    processor_amount_kobo: number;
    service_amount_kobo: number;
    agent_amount_kobo: number;
}
export interface AssessmentLineRow {
    id: string;
    assessment_id: string;
    component: string;
    amount_kobo: number;
}
export interface DistributionFilters {
    from?: string;
    to?: string;
    transactionType?: string;
    agentId?: string;
}
export interface ActorContext {
    id?: string | null;
    email?: string | null;
}
export interface AgentFeeStakeholderLink {
    agent_id: string;
    stakeholder_id: string;
    agent_code: string;
    agent_status?: string;
}
export interface TenantAgentLink {
    tenant_id: string;
    agent_id: string;
    agent_code: string;
}
export interface FeeDistributionStore {
    stakeholders: FeeStakeholderRecord[];
    payables: FeePayableRecord[];
    withdrawals: FeeWithdrawalRecord[];
    settlements: FeeSettlementRecord[];
    events: FeeDistributionEvent[];
    assessments: AssessmentRow[];
    lines: AssessmentLineRow[];
    tenantAgents: TenantAgentLink[];
    agentFeeStakeholders: AgentFeeStakeholderLink[];
    unattributedAgentFeeLineIds: string[];
}
export declare function emptyDistributionStore(): FeeDistributionStore;
export declare function systemStakeholder(store: FeeDistributionStore, type: FeeStakeholderType): FeeStakeholderRecord | undefined;
export declare function isSystemAgentStakeholder(row: FeeStakeholderRecord | undefined): boolean;
export declare function ensureIndividualAgentStakeholder(store: FeeDistributionStore, agent: {
    agent_id: string;
    agent_code: string;
    display_name?: string;
    status?: string;
}): FeeStakeholderRecord;
export declare function resolveAgentFeeStakeholder(store: FeeDistributionStore, assessment: AssessmentRow, line: AssessmentLineRow): {
    stakeholder: FeeStakeholderRecord;
    attributed: boolean;
};
export declare function seedSystemStakeholders(now?: string): FeeStakeholderRecord[];
export declare function filterAssessments(store: FeeDistributionStore, filters: DistributionFilters): AssessmentRow[];
export declare function payableStatusForAssessmentMode(mode: string): FeePayableStatus;
export declare function materializePayables(store: FeeDistributionStore, assessment: AssessmentRow): FeePayableRecord[];
export declare function materializeAllPayables(store: FeeDistributionStore): number;
export declare function reservedKobo(store: FeeDistributionStore, stakeholderId: string): number;
export declare function rawAvailableKobo(store: FeeDistributionStore, stakeholderId: string): number;
export declare function availableKobo(store: FeeDistributionStore, stakeholderId: string): number;
export declare function stakeholderBalances(store: FeeDistributionStore, stakeholderId: string): {
    earned_kobo: number;
    pending_kobo: number;
    available_kobo: number;
    settled_kobo: number;
    reservation_kobo: number;
    assessment_count: number;
};
export declare function summarizeDistribution(store: FeeDistributionStore, filters?: DistributionFilters): {
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
    components: {
        PLATFORM: {
            allocation_kobo: number;
            label: string;
        };
        PROCESSOR: {
            allocation_kobo: number;
            label: string;
        };
        SERVICE: {
            allocation_kobo: number;
            label: string;
        };
        AGENT: {
            allocation_kobo: number;
            label: string;
        };
    };
    stakeholders: {
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
    transaction_types_with_activity: {
        transaction_type: string;
        count: number;
    }[];
    filtered_assessment_ids: string[];
};
export declare function createStakeholder(store: FeeDistributionStore, input: {
    stakeholder_type: FeeStakeholderType;
    display_name: string;
    metadata?: Record<string, unknown>;
    status?: FeeStakeholderStatus;
}, actor?: ActorContext): FeeStakeholderRecord;
export declare function updateStakeholder(store: FeeDistributionStore, id: string, patch: {
    display_name?: string;
    status?: FeeStakeholderStatus;
    metadata?: Record<string, unknown>;
}, actor?: ActorContext): FeeStakeholderRecord;
export declare function requestWithdrawal(store: FeeDistributionStore, input: {
    stakeholderId: string;
    amountKobo: unknown;
    clientRequestId: string;
    ownerAgentId?: string | null;
    afterAvailabilityCheck?: () => void;
}, actor?: ActorContext): {
    withdrawal: FeeWithdrawalRecord;
    replayed: boolean;
};
export declare function approveWithdrawal(store: FeeDistributionStore, withdrawalId: string, actor?: ActorContext): {
    withdrawal: FeeWithdrawalRecord;
    settlement: FeeSettlementRecord;
};
export declare function rejectWithdrawal(store: FeeDistributionStore, withdrawalId: string, reason: string, actor?: ActorContext): FeeWithdrawalRecord;
export declare function cancelWithdrawal(store: FeeDistributionStore, withdrawalId: string, actor?: ActorContext): FeeWithdrawalRecord;
export declare function approveSettlement(store: FeeDistributionStore, settlementId: string, actor?: ActorContext): FeeSettlementRecord;
export declare function markSettlementProcessing(store: FeeDistributionStore, settlementId: string, actor?: ActorContext): FeeSettlementRecord;
export declare function completeSettlement(): never;
export declare function failSettlement(store: FeeDistributionStore, settlementId: string, reason: string, actor?: ActorContext): FeeSettlementRecord;
