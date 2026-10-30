"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputePolicyError = exports.DISPUTE_STATUSES = exports.DISPUTE_TYPES = void 0;
exports.normalizeEmail = normalizeEmail;
exports.assertCheckerIsNotMaker = assertCheckerIsNotMaker;
exports.parseAmountKobo = parseAmountKobo;
exports.parseCaseType = parseCaseType;
exports.ledgerCreditAccount = ledgerCreditAccount;
exports.isTransientQuasarError = isTransientQuasarError;
exports.koboToNaira = koboToNaira;
exports.DISPUTE_TYPES = ['REFUND', 'CHARGEBACK', 'MANUAL_DEBIT'];
exports.DISPUTE_STATUSES = [
    'PENDING_CHECKER',
    'APPROVED_EXECUTING',
    'POSTED',
    'REJECTED',
    'FAILED',
];
class DisputePolicyError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.name = 'DisputePolicyError';
        this.status = status;
    }
}
exports.DisputePolicyError = DisputePolicyError;
function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}
function assertCheckerIsNotMaker(params) {
    const makerId = String(params.makerId || '').trim();
    const checkerId = String(params.checkerId || '').trim();
    const makerEmail = normalizeEmail(params.makerEmail);
    const checkerEmail = normalizeEmail(params.checkerEmail);
    if (makerId && checkerId && makerId === checkerId) {
        throw new DisputePolicyError('Maker-checker violation: the operator who created this case cannot approve or reject it.', 403);
    }
    if (makerEmail && checkerEmail && makerEmail === checkerEmail) {
        throw new DisputePolicyError('Maker-checker violation: the operator who created this case cannot approve or reject it.', 403);
    }
}
function parseAmountKobo(body) {
    const koboRaw = body.amountKobo ?? body.amount_kobo;
    if (koboRaw !== undefined && koboRaw !== null && koboRaw !== '') {
        const kobo = Math.round(Number(koboRaw));
        if (!Number.isFinite(kobo) || kobo <= 0) {
            throw new DisputePolicyError('amountKobo must be a positive integer (kobo).');
        }
        return kobo;
    }
    const nairaRaw = body.amountNaira ?? body.amount;
    const naira = Number(nairaRaw);
    if (!Number.isFinite(naira) || naira <= 0) {
        throw new DisputePolicyError('Enter a positive amount in Naira (or amountKobo).');
    }
    return Math.round(naira * 100);
}
function parseCaseType(raw) {
    const value = String(raw || '').trim().toUpperCase();
    if (exports.DISPUTE_TYPES.includes(value)) {
        return value;
    }
    throw new DisputePolicyError('caseType must be REFUND, CHARGEBACK, or MANUAL_DEBIT.');
}
function ledgerCreditAccount(type) {
    if (type === 'REFUND')
        return 'REFUNDS';
    if (type === 'CHARGEBACK')
        return 'CHARGEBACKS';
    return 'ADJUSTMENTS';
}
function isTransientQuasarError(err) {
    const message = String(err?.message || '');
    return /timeout|ECONNABORTED|ETIMEDOUT|ECONNRESET|socket hang up|network/i.test(message);
}
function koboToNaira(kobo) {
    return Math.round(Number(kobo) || 0) / 100;
}
//# sourceMappingURL=financial-dispute.policy.js.map