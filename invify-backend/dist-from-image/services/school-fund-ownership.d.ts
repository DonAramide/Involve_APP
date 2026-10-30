/**
 * School-owned funds versus parent liability.
 * Amounts are calculated in integer kobo and converted to naira only at the
 * ledger boundary used by the existing USER_WALLET postings.
 * This module does not read or write a database.
 */
export declare function nairaToKobo(naira: number): number;
export declare function koboToNaira(kobo: number): number;
export type LedgerLeg = {
    account: 'QUASAR_CLEARING' | 'PARENT_LIABILITY' | 'USER_WALLET';
    type: 'DEBIT' | 'CREDIT';
    amount: number;
};
/** Parent deposit: clearing debit, parent liability credit. Never USER_WALLET. */
export declare function parentDepositLedgerEntries(amountNaira: number): LedgerLeg[];
/** Move an allocated slice from the parent to the school once. */
export declare function parentAllocationLedgerEntries(amountNaira: number): LedgerLeg[];
export declare function creditsUserWallet(entries: LedgerLeg[]): boolean;
/**
 * School spendable naira. Parent-tagged credits that were posted onto
 * USER_WALLET are subtracted. A low cache is not an input and cannot create a credit.
 */
export declare function spendableSchoolKobo(userWalletKobo: number, parentTaggedWalletCreditKobo: number): number;
/** One identity for a provider reference, a parent payment, and an invoice leg. */
export declare function allocationIdentity(reference: string): string;
/** True when a historical parent deposit was credited to the school wallet. */
export declare function parentCreditLandedOnSchoolWallet(metadata: Record<string, unknown> | null | undefined): boolean;
