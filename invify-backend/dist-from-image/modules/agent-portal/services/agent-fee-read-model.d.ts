export type AgentFeeAssessmentRow = {
    id: string;
    tenant_id: string;
    transaction_type?: string | null;
    source_idempotency_key?: string | null;
    principal_amount_kobo?: number | null;
    final_fee_kobo?: number | null;
    agent_amount_kobo?: number | null;
    mode?: string | null;
    created_at?: string | null;
};
export type AgentFeeLineRow = {
    assessment_id: string;
    component: string;
    amount_kobo: number;
};
export declare function isFeeOrchestrationLive(): boolean;
export declare function isAgentPayoutExecutionEnabled(): boolean;
export declare function filterAssessmentsByOwnedTenants<T extends {
    tenant_id: string;
}>(rows: T[], ownedTenantIds: Iterable<string>): T[];
export declare function agentShareKobo(assessment: AgentFeeAssessmentRow, lines: AgentFeeLineRow[]): number;
export declare function summarizeAgentFeeReadModel(input: {
    agentCode: string;
    assessments: AgentFeeAssessmentRow[];
    lines: AgentFeeLineRow[];
    ownedTenantIds: Iterable<string>;
    agentId?: string | null;
    stakeholderId?: string | null;
    systemAgentStakeholderId?: string | null;
    payables?: Array<{
        stakeholder_id: string;
        amount_kobo: number;
        status: string;
        assessment_id?: string;
    }>;
    withdrawals?: Array<{
        stakeholder_id: string;
        amount_kobo: number;
        status: string;
    }>;
}): Record<string, unknown>;
export declare function loadAgentFeeReadModel(agentCode: string, ownedTenantIds: string[], agentId?: string): Promise<Record<string, unknown>>;
export declare function loadAttributedTenantIds(agentId: string, agentCode: string): Promise<{
    tenantIds: string[];
    attributedTenants: any[];
}>;
