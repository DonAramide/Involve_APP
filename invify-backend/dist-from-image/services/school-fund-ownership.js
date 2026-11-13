"use strict";
/**
 * School-owned funds versus parent liability.
 * Amounts are calculated in integer kobo and converted to naira only at the
 * ledger boundary used by the existing USER_WALLET postings.
 * This module does not read or write a database.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nairaToKobo = nairaToKobo;
exports.koboToNaira = koboToNaira;
exports.parentDepositLedgerEntries = parentDepositLedgerEntries;
exports.parentAllocationLedgerEntries = parentAllocationLedgerEntries;
exports.creditsUserWallet = creditsUserWallet;
exports.spendableSchoolKobo = spendableSchoolKobo;
exports.allocationIdentity = allocationIdentity;
exports.parentCreditLandedOnSchoolWallet = parentCreditLandedOnSchoolWallet;
function nairaToKobo(naira) {
    const value = Number(naira);
    if (!Number.isFinite(value))
        return 0;
    return Math.round((value + Number.EPSILON) * 100);
}
function koboToNaira(kobo) {
    return nairaToKobo(kobo / 100) / 100;
}
/** Parent deposit: clearing debit, parent liability credit. Never USER_WALLET. */
function parentDepositLedgerEntries(amountNaira) {
    const amount = koboToNaira(nairaToKobo(amountNaira));
    return [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount },
        { account: 'PARENT_LIABILITY', type: 'CREDIT', amount },
    ];
}
/** Move an allocated slice from the parent to the school once. */
function parentAllocationLedgerEntries(amountNaira) {
    const amount = koboToNaira(nairaToKobo(amountNaira));
    return [
        { account: 'PARENT_LIABILITY', type: 'DEBIT', amount },
        { account: 'USER_WALLET', type: 'CREDIT', amount },
    ];
}
function creditsUserWallet(entries) {
    return entries.some((entry) => entry.account === 'USER_WALLET' && entry.type === 'CREDIT');
}
/**
 * School spendable naira. Parent-tagged credits that were posted onto
 * USER_WALLET are subtracted. A low cache is not an input and cannot create a credit.
 */
function spendableSchoolKobo(userWalletKobo, parentTaggedWalletCreditKobo) {
    const wallet = Math.max(0, Math.trunc(userWalletKobo));
    const parent = Math.max(0, Math.trunc(parentTaggedWalletCreditKobo));
    return Math.max(0, wallet - parent);
}
/** One identity for a provider reference, a parent payment, and an invoice leg. */
function allocationIdentity(reference) {
    const cleaned = String(reference || '').trim().replace(/^qwd:/, '');
    if (!cleaned)
        return '';
    return `alloc:${cleaned}`;
}
/** True when a historical parent deposit was credited to the school wallet. */
function parentCreditLandedOnSchoolWallet(metadata) {
    if (!metadata || metadata.paidVia !== 'parent_account')
        return false;
    return metadata.schoolWalletCredit !== false;
}
//# sourceMappingURL=school-fund-ownership.js.map