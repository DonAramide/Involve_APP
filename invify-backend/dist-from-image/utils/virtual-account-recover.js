"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExistingVaError = isExistingVaError;
exports.pickAccountFields = pickAccountFields;
exports.last10PhoneDigits = last10PhoneDigits;
function isExistingVaError(message) {
    const msg = String(message || '');
    return /already exists for this student/i.test(msg) || /virtual account already exists/i.test(msg);
}
function pickAccountFields(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const data = raw.data && typeof raw.data === 'object' && !raw.accountNumber ? raw.data : raw;
    const accountNumber = String(data.accountNumber ||
        data.account_number ||
        data.nuban ||
        data.virtualAccountNumber ||
        data.virtual_account_number ||
        '').trim();
    if (!accountNumber)
        return null;
    return {
        accountNumber,
        bankName: String(data.bankName || data.bank_name || data.bank || 'Quasar').trim() || 'Quasar',
        accountName: data.accountName || data.account_name || undefined,
    };
}
function last10PhoneDigits(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    return digits.length <= 10 ? digits : digits.slice(-10);
}
//# sourceMappingURL=virtual-account-recover.js.map