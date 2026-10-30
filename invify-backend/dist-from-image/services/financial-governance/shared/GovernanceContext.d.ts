export type OperationType = 'TRANSFER' | 'WITHDRAWAL' | 'SETTLEMENT' | 'VIRTUAL_ACCOUNT' | 'WEBHOOK_CREDIT' | 'REFUND' | 'REVERSAL' | 'TREASURY_MOVEMENT' | 'POLICY_CHANGE' | 'CONFIGURATION_CHANGE';
export interface GovernanceContext {
    correlationId: string;
    tenantId: string;
    operationType: OperationType;
    amount?: number;
    currency?: string;
    provider?: string;
    /** Country code for geo-based governance */
    country?: string;
    /** Operator initiating the request */
    requestedBy?: string;
    metadata?: Record<string, any>;
    timestamp: string;
}
