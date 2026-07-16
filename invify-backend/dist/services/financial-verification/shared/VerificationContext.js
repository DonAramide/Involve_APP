"use strict";
// src/services/financial-verification/shared/VerificationContext.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationContext = void 0;
const VerificationCache_1 = require("./VerificationCache");
class VerificationContext {
    correlationId;
    tenantId;
    amount;
    currency;
    financialEventId;
    beneficiaryAccountNumber;
    beneficiaryBankCode;
    provider;
    providerReference;
    requestId;
    metadata;
    riskMetadata;
    _cache;
    constructor(params) {
        this.correlationId = params.correlationId || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : require('crypto').randomUUID());
        this.tenantId = params.tenantId;
        this.amount = params.amount;
        this.currency = params.currency;
        this.financialEventId = params.financialEventId;
        this.beneficiaryAccountNumber = params.beneficiaryAccountNumber;
        this.beneficiaryBankCode = params.beneficiaryBankCode;
        this.provider = params.provider;
        this.providerReference = params.providerReference;
        this.requestId = params.requestId;
        this.metadata = Object.freeze({ ...(params.metadata || {}) });
        this.riskMetadata = Object.freeze({ ...(params.riskMetadata || {}) });
        this._cache = new VerificationCache_1.VerificationCache();
    }
    async getCached(key, fetchFn) {
        return this._cache.get(key, fetchFn);
    }
    getCache() {
        return this._cache;
    }
}
exports.VerificationContext = VerificationContext;
//# sourceMappingURL=VerificationContext.js.map