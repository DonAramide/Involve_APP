export declare function vaInwardChargeNaira(creditNaira: number, feeNaira: number): number;
/**
 * Takes the published inward charge off the school wallet after the gross
 * VA credit. Idempotent. Does not change the fee profile.
 */
export declare function deductVaInwardCharge(params: {
    tenantId: string;
    amountNaira: number;
    reference: string;
}): Promise<{
    status: string;
    deducted: number;
}>;
