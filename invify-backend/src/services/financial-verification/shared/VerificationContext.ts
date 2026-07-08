// src/services/financial-verification/shared/VerificationContext.ts

import { VerificationCache } from "./VerificationCache";

export class VerificationContext {
  public readonly correlationId: string;
  public readonly tenantId: string;
  public readonly amount: number;
  public readonly currency: string;
  public readonly financialEventId?: string;
  public readonly beneficiaryAccountNumber?: string;
  public readonly beneficiaryBankCode?: string;
  public readonly provider?: string;
  public readonly providerReference?: string;
  public readonly requestId?: string;
  public readonly metadata: Readonly<Record<string, any>>;
  public readonly riskMetadata: Readonly<Record<string, any>>;
  
  private readonly _cache: VerificationCache;

  constructor(params: {
    correlationId?: string;
    tenantId: string;
    amount: number;
    currency: string;
    financialEventId?: string;
    beneficiaryAccountNumber?: string;
    beneficiaryBankCode?: string;
    provider?: string;
    providerReference?: string;
    requestId?: string;
    metadata?: Record<string, any>;
    riskMetadata?: Record<string, any>;
  }) {
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
    this._cache = new VerificationCache();
  }

  public async getCached<T>(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<{ value: T; hit: boolean }> {
    return this._cache.get(key, fetchFn);
  }

  public getCache(): VerificationCache {
    return this._cache;
  }
}
