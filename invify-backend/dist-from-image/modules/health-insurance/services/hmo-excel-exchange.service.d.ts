export type BatchStatus = 'draft' | 'validating' | 'validation_failed' | 'ready_for_export' | 'exported' | 'submitted_to_hmo' | 'awaiting_hmo_response' | 'partially_processed' | 'reconciled' | 'completed' | 'cancelled';
export declare const ALLOWED_BATCH_TRANSITIONS: Record<BatchStatus, BatchStatus[]>;
/**
 * Protects exported/imported spreadsheet cells against CSV/Excel formula injection (CSV Injection / CWE-1236).
 * Prefixes values starting with =, +, -, @, TAB, or CR with a single quote (') unless it is a pure negative number.
 */
export declare function sanitizeSpreadsheetCell(value: any): string;
/**
 * Strips leading formula-escape characters or dangerous formula prefixes on inbound HMO response values.
 */
export declare function cleanInboundCell(value: any): string;
/**
 * Escapes a sanitized cell for RFC 4180 CSV output.
 */
export declare function escapeCsvField(value: any, delimiter?: string): string;
/**
 * Parses a CSV string into an array of objects keyed by normalized uppercase header names.
 */
export declare function parseCsvContent(csvText: string, delimiter?: string): {
    headers: string[];
    rows: Array<{
        rowNumber: number;
        raw: Record<string, string>;
    }>;
};
export declare function formatDateByPattern(dateStr: string | null | undefined, pattern?: string): string;
export declare function normalizeInboundDate(raw: string | null | undefined): string | null;
export declare const DEFAULT_EXPORT_COLUMNS: {
    sourceField: string;
    headerName: string;
    required: boolean;
}[];
export interface ReconcileRowInput {
    rowNumber: number;
    enrolmentReference: string;
    batchReference?: string;
    hmoMemberId?: string;
    hmoPolicyNumber?: string;
    confirmationStatus: string;
    confirmedEffectiveDate?: string | null;
    confirmedExpiryDate?: string | null;
    assignedFacilityRef?: string;
    rejectionCode?: string;
    rejectionReason?: string;
    rawSanitized: Record<string, string>;
}
export declare class HmoExcelExchangeService {
    /**
     * Lists export mapping configurations for the authenticated HMO provider.
     */
    listMappings(providerId: string): Promise<any[]>;
    /**
     * Creates or updates an HMO export mapping configuration.
     */
    saveMapping(providerId: string, userId: string | null, payload: any): Promise<any>;
    /**
     * Validates a batch item's required fields before export.
     */
    validateBatchItem(item: {
        enrolment_reference?: string;
        member_full_name?: string;
        member_category?: string;
        date_of_birth?: string | null;
        sex?: string | null;
        plan_code?: string;
        period_start?: string | null;
        period_end?: string | null;
    }): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Generates a sanitized CSV string for an enrollment batch using the HMO's mapping template.
     */
    generateBatchCsv(params: {
        batchReference: string;
        items: any[];
        columnMappings?: Array<{
            sourceField: string;
            headerName: string;
        }>;
        dateFormat?: string;
        delimiter?: string;
    }): {
        csv: string;
        filename: string;
        rowCount: number;
    };
    /**
     * Parses and validates an uploaded HMO response CSV file and produces a structured preview
     * before or during reconciliation.
     */
    parseResponseCsvToRows(csvText: string): {
        checksumSha256: string;
        headers: string[];
        rows: ReconcileRowInput[];
    };
    /**
     * Deterministic, idempotent reconciliation engine for HMO response rows against known batch items.
     * Can run against DB records or in-memory batch items (for preview & unit tests).
     */
    reconcileRowsInMemory(params: {
        providerId: string;
        batchReference?: string;
        parsedRows: ReconcileRowInput[];
        existingBatchItems: Array<{
            id: string;
            batch_id: string;
            provider_id: string;
            tenant_id: string;
            enrolment_id: string;
            member_id: string;
            enrolment_reference: string;
            reconciliation_status: string;
            hmo_member_id?: string | null;
            hmo_policy_number?: string | null;
            period_start?: string | null;
            period_end?: string | null;
        }>;
    }): {
        summary: {
            totalRows: number;
            matchedRows: number;
            confirmedRows: number;
            rejectedRows: number;
            unmatchedRows: number;
            duplicateRows: number;
            invalidRows: number;
            nextBatchStatus: "reconciled" | "awaiting_hmo_response" | "partially_processed";
        };
        results: {
            rowNumber: number;
            enrolmentReference: string;
            batchItemId: string | null;
            enrolmentId: string | null;
            tenantId: string | null;
            memberId: string | null;
            outcome: "matched_confirmed" | "matched_rejected" | "duplicate_ignored" | "unmatched_reference" | "cross_hmo_violation" | "validation_error";
            hmoMemberId: string | null;
            hmoPolicyNumber: string | null;
            confirmedEffectiveDate: string | null;
            confirmedExpiryDate: string | null;
            assignedFacilityRef: string | null;
            rejectionCode: string | null;
            rejectionReason: string | null;
            errorDetails: string | null;
            rawSanitized: Record<string, string>;
        }[];
    };
}
export declare const hmoExcelExchangeService: HmoExcelExchangeService;
