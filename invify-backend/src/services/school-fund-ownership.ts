/**
 * School-owned funds versus parent liability.
 * Amounts are calculated in integer kobo and converted to naira only at the
 * ledger boundary used by the existing USER_WALLET postings.
 * This module does not read or write a database.
 */

export function nairaToKobo(naira: number): number {
  const value = Number(naira);
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100);
}

export function koboToNaira(kobo: number): number {
  return nairaToKobo(kobo / 100) / 100;
}

export type LedgerLeg = {
  account: 'QUASAR_CLEARING' | 'PARENT_LIABILITY' | 'USER_WALLET';
  type: 'DEBIT' | 'CREDIT';
  amount: number;
};

/** Parent deposit: clearing debit, parent liability credit. Never USER_WALLET. */
export function parentDepositLedgerEntries(amountNaira: number): LedgerLeg[] {
  const amount = koboToNaira(nairaToKobo(amountNaira));
  return [
    { account: 'QUASAR_CLEARING', type: 'DEBIT', amount },
    { account: 'PARENT_LIABILITY', type: 'CREDIT', amount },
  ];
}

/** Move an allocated slice from the parent to the school once. */
export function parentAllocationLedgerEntries(amountNaira: number): LedgerLeg[] {
  const amount = koboToNaira(nairaToKobo(amountNaira));
  return [
    { account: 'PARENT_LIABILITY', type: 'DEBIT', amount },
    { account: 'USER_WALLET', type: 'CREDIT', amount },
  ];
}

export function creditsUserWallet(entries: LedgerLeg[]): boolean {
  return entries.some((entry) => entry.account === 'USER_WALLET' && entry.type === 'CREDIT');
}

/**
 * School spendable naira. Parent-tagged credits that were posted onto
 * USER_WALLET are subtracted. A low cache is not an input and cannot create a credit.
 */
export function spendableSchoolKobo(userWalletKobo: number, parentTaggedWalletCreditKobo: number): number {
  const wallet = Math.max(0, Math.trunc(userWalletKobo));
  const parent = Math.max(0, Math.trunc(parentTaggedWalletCreditKobo));
  return Math.max(0, wallet - parent);
}

/** One identity for a provider reference, a parent payment, and an invoice leg. */
export function allocationIdentity(reference: string): string {
  const cleaned = String(reference || '').trim().replace(/^qwd:/, '');
  if (!cleaned) return '';
  return `alloc:${cleaned}`;
}

/** True when a historical parent deposit was credited to the school wallet. */
export function parentCreditLandedOnSchoolWallet(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata || metadata.paidVia !== 'parent_account') return false;
  return metadata.schoolWalletCredit !== false;
}
