import { supabaseAdmin } from '../db/supabase';
export type AssessmentListFilters = {
    transactionType?: string;
    mode?: string;
    kind?: string;
    sourceSystem?: string;
    sourceIdempotencyKey?: string;
    reference?: string;
    from?: string;
    to?: string;
    limit?: number;
    agentId?: string;
    tenantId?: string;
};
export declare class PlatformFeeAssessmentsService {
    private readonly db;
    constructor(db?: Pick<typeof supabaseAdmin, 'from'>);
    private lookupUser;
    private lookupTenant;
    private loadFormulaGovernance;
    list(filters?: AssessmentListFilters): Promise<{
        id: string;
        tenant_id: string | null;
        agent_id: string | null;
        fee_profile_id: string | null;
        resolved_source: any;
        transaction_type: any;
        mode: any;
        kind: any;
        source_system: any;
        source_idempotency_key: any;
        source_id: any;
        event_time: any;
        created_at: any;
        transaction_amount_kobo: number;
        calculated_fee_kobo: number;
        min_applied_kobo: number;
        cap_applied_kobo: number;
        min_fee_kobo: number;
        max_fee_kobo: number;
        final_fee_kobo: number;
        profile_version_id: string | null;
        override_version_id: string | null;
        method: any;
        calculation_snapshot: {
            method: any;
            percentage_bps: number;
            flat_amount_kobo: number;
            min_fee_kobo: number;
            max_fee_kobo: number;
            calculated_fee_kobo: number;
            min_applied_kobo: number;
            cap_applied_kobo: number;
            final_fee_kobo: number;
        };
        config_snapshot: {
            profile_version_id: any;
            override_version_id: any;
            platform_share_bps: number;
            processor_share_bps: number;
            service_share_bps: number;
            agent_share_bps: number;
        };
        distribution_totals: {
            PLATFORM_FEE: number;
            PROCESSOR_FEE: number;
            SERVICE_FEE: number;
            AGENT_FEE: number;
            total_distributed_kobo: number;
            matches_final_fee: boolean;
        };
    }[]>;
    get(id: string): Promise<{
        tenant: {
            id: null;
            name: null;
        } | {
            id: string;
            name: string;
        };
        tenant_name: string | null;
        fee_assessed_kobo: number;
        fee_collected: boolean;
        split_formula: {
            text: string;
            method: any;
            percentage_bps: number;
            flat_amount_kobo: number;
            min_fee_kobo: number;
            max_fee_kobo: number;
            platform_share_bps: number;
            processor_share_bps: number;
            service_share_bps: number;
            agent_share_bps: number;
            platform_share_pct: string;
            processor_share_pct: string;
            service_share_pct: string;
            agent_share_pct: string;
        };
        formula_governance: {
            source: null;
            version_id: null;
            version_number: null;
            status: null;
            formula_modified_at: null;
            formula_modified_by: null;
            formula_modified_by_label: null;
            formula_approved_at: null;
            formula_approved_by: null;
            formula_approved_by_label: null;
            recorded: boolean;
            missing_reason: string;
        } | {
            source: string;
            version_id: string;
            version_number: number | null;
            status: any;
            formula_modified_at: any;
            formula_modified_by: {
                id: string;
                email: string | null;
                name: string | null;
            } | null;
            formula_modified_by_label: string | null;
            formula_approved_at: any;
            formula_approved_by: {
                id: string;
                email: string | null;
                name: string | null;
            } | null;
            formula_approved_by_label: string | null;
            recorded: boolean;
            missing_reason: string | null;
        };
        ledger_entry_id: string | null;
        lines: {
            id: string | null;
            component: any;
            component_label: string;
            amount_kobo: number;
            percent_bps: number;
            ledger_entry_id: string | null;
        }[];
        distribution: {
            PLATFORM_FEE: number;
            PROCESSOR_FEE: number;
            SERVICE_FEE: number;
            AGENT_FEE: number;
            total_distributed_kobo: number;
            matches_final_fee: boolean;
        };
        id: string;
        tenant_id: string | null;
        agent_id: string | null;
        fee_profile_id: string | null;
        resolved_source: any;
        transaction_type: any;
        mode: any;
        kind: any;
        source_system: any;
        source_idempotency_key: any;
        source_id: any;
        event_time: any;
        created_at: any;
        transaction_amount_kobo: number;
        calculated_fee_kobo: number;
        min_applied_kobo: number;
        cap_applied_kobo: number;
        min_fee_kobo: number;
        max_fee_kobo: number;
        final_fee_kobo: number;
        profile_version_id: string | null;
        override_version_id: string | null;
        method: any;
        calculation_snapshot: {
            method: any;
            percentage_bps: number;
            flat_amount_kobo: number;
            min_fee_kobo: number;
            max_fee_kobo: number;
            calculated_fee_kobo: number;
            min_applied_kobo: number;
            cap_applied_kobo: number;
            final_fee_kobo: number;
        };
        config_snapshot: {
            profile_version_id: any;
            override_version_id: any;
            platform_share_bps: number;
            processor_share_bps: number;
            service_share_bps: number;
            agent_share_bps: number;
        };
        distribution_totals: {
            PLATFORM_FEE: number;
            PROCESSOR_FEE: number;
            SERVICE_FEE: number;
            AGENT_FEE: number;
            total_distributed_kobo: number;
            matches_final_fee: boolean;
        };
    }>;
    reconciliation(filters?: AssessmentListFilters): Promise<{
        assessment_count: number;
        total_transaction_amount_kobo: number;
        total_calculated_fee_kobo: number;
        total_final_fee_kobo: number;
        component_totals: {
            PLATFORM_FEE: number;
            PROCESSOR_FEE: number;
            SERVICE_FEE: number;
            AGENT_FEE: number;
        };
        errors: {
            invalid_distribution_count: number;
            missing_line_count: number;
            invalid_assessment_ids: string[];
            missing_line_assessment_ids: string[];
        };
        legacy_comparison: {
            read_only: boolean;
            note: string;
        };
    }>;
}
export declare const platformFeeAssessmentsService: PlatformFeeAssessmentsService;
