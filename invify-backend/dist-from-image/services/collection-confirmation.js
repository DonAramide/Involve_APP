"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStableCommandId = isStableCommandId;
exports.classifyCollectionConfirmation = classifyCollectionConfirmation;
exports.providerCreditIdempotencyKey = providerCreditIdempotencyKey;
function normalizeMethod(method) {
    return String(method || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}
function isStableCommandId(value) {
    const id = String(value || '').trim();
    if (id.length < 16)
        return false;
    if (/^\d+$/.test(id))
        return false;
    return true;
}
function classifyCollectionConfirmation(method, opts = {}) {
    const m = normalizeMethod(method);
    const provider = String(opts.providerReference || '').trim();
    const confirmed = opts.confirmed === true;
    if (m === 'parent_credit' || m.includes('parent_credit') || m === 'wallet' || m === 'parent_wallet') {
        return 'recorded';
    }
    if (m.includes('virtualaccount') ||
        m.includes('virtual_account') ||
        m === 'va' ||
        m.includes('va_transfer')) {
        return provider ? 'settled' : 'unconfirmed';
    }
    if (m === 'transfer' || m.includes('bank_transfer') || m.includes('company_account') || m.includes('company_bank')) {
        return confirmed ? 'recorded' : 'unconfirmed';
    }
    if (m.includes('pos') || m.includes('card') || m.includes('mpos') || m.includes('nibss')) {
        return provider ? 'settled' : 'unconfirmed';
    }
    if (m === 'cash' || m.includes('cash')) {
        return 'recorded';
    }
    return 'unconfirmed';
}
function providerCreditIdempotencyKey(reference) {
    const cleaned = String(reference || '').trim().replace(/^qwd:/, '');
    return `quasar:${cleaned}:credit`;
}
//# sourceMappingURL=collection-confirmation.js.map