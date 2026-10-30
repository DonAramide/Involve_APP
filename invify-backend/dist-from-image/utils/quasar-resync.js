"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUASAR_RESYNC_DAYS = exports.QUASAR_RESYNC_LIMIT = void 0;
exports.quasarEntryTimestamp = quasarEntryTimestamp;
exports.selectQuasarResyncEntries = selectQuasarResyncEntries;
exports.quasarLedgerAmountNaira = quasarLedgerAmountNaira;
exports.isQuasarCreditEntry = isQuasarCreditEntry;
exports.isSameQuasarCredit = isSameQuasarCredit;
exports.quasarLedgerReference = quasarLedgerReference;
const virtual_account_funds_1 = require("./virtual-account-funds");
exports.QUASAR_RESYNC_LIMIT = 50;
exports.QUASAR_RESYNC_DAYS = 20;
function quasarEntryTimestamp(entry) {
    const ts = Date.parse(String(entry?.created_at || entry?.createdAt || entry?.timestamp || entry?.postedAt || ''));
    return Number.isFinite(ts) ? ts : NaN;
}
/**
 * Newest-first ledger page. Keep the latest 50 entries, and also any older
 * entry that still falls inside the last 20 days.
 */
function selectQuasarResyncEntries(entriesNewestFirst, now = Date.now()) {
    const cutoff = now - exports.QUASAR_RESYNC_DAYS * 24 * 60 * 60 * 1000;
    return (entriesNewestFirst || []).filter((entry, index) => {
        if (index < exports.QUASAR_RESYNC_LIMIT)
            return true;
        const ts = quasarEntryTimestamp(entry);
        return Number.isFinite(ts) && ts >= cutoff;
    });
}
function quasarLedgerAmountNaira(entry) {
    const exact = Number(entry?.amountNaira ?? entry?.amount_naira);
    if (Number.isFinite(exact) && exact > 0)
        return (0, virtual_account_funds_1.roundNaira)(exact);
    const kobo = Number(entry?.amount_kobo ?? entry?.amountKobo);
    if (Number.isFinite(kobo) && kobo > 0)
        return (0, virtual_account_funds_1.roundNaira)(kobo / 100);
    const amount = Number(entry?.amount);
    if (!Number.isFinite(amount) || amount <= 0)
        return 0;
    if (String(entry?.amount).includes('.'))
        return (0, virtual_account_funds_1.roundNaira)(amount);
    return (0, virtual_account_funds_1.roundNaira)(amount / 100);
}
function isQuasarCreditEntry(entry) {
    const direction = String(entry?.direction || entry?.type || entry?.entryType || '').toLowerCase();
    if (['debit', 'dr', 'sweep', 'withdrawal', 'out'].includes(direction))
        return false;
    return ['credit', 'cr', 'deposit', 'inward', 'funding'].includes(direction);
}
/** Same amount within 2 minutes — webhook qfs_credit_* vs ledger id. */
function isSameQuasarCredit(left, right) {
    if (Math.abs(Number(left.amount || 0) - Number(right.amount || 0)) > 0.009)
        return false;
    const a = Date.parse(String(left.createdAt || ''));
    const b = Date.parse(String(right.createdAt || ''));
    if (!Number.isFinite(a) || !Number.isFinite(b))
        return false;
    return Math.abs(a - b) < 120_000;
}
function quasarLedgerReference(entry, accountId) {
    const reference = String(entry?.reference || entry?.correlation_id || entry?.correlationId || '').trim();
    if (reference)
        return reference;
    const id = String(entry?.id || entry?.ledgerEntryId || '').trim();
    return id ? `quasar-ledger:${accountId}:${id}` : '';
}
//# sourceMappingURL=quasar-resync.js.map