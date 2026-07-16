import { FeeConfiguration } from '../../contracts/billing/FeeStructures';
export interface FeeCalculationContext {
    tenantId: string;
    region?: string;
    transactionAmount: number;
}
export interface CalculatedFeeResult {
    baseAmount: number;
    calculatedFee: number;
    netAmount: number;
    currency: string;
    feeConfigId: string;
    versionUsed: number;
    isOverrideApplied: boolean;
}
export declare class FinancialRuleEngine {
    /**
     * Calculates the exact transaction fee deterministically based on the provided configuration.
     * Resolves flat rates, percentage bounds, min/max caps, and tenant/regional overrides.
     */
    static calculateFee(config: FeeConfiguration, context: FeeCalculationContext): CalculatedFeeResult;
    /**
     * Applies Tenant or Regional Overrides if they exist in the FeeConfiguration.
     */
    private static resolveActiveRules;
    private static mergeOverride;
    private static calculatePercentage;
    /**
     * Deterministic half-even rounding (Bankers Rounding) to avoid precision drift.
     */
    static bankersRound(num: number): number;
}
