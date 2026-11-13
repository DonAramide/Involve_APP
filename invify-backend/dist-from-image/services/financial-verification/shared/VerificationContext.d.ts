import { VerificationCache } from "./VerificationCache";
export declare class VerificationContext {
    readonly correlationId: string;
    readonly tenantId: string;
    readonly amount: number;
    readonly currency: string;
    readonly financialEventId?: string;
    readonly beneficiaryAccountNumber?: string;
    readonly beneficiaryBankCode?: string;
    readonly provider?: string;
    readonly providerReference?: string;
    readonly requestId?: string;
    readonly metadata: Readonly<Record<string, any>>;
    readonly riskMetadata: Readonly<Record<string, any>>;
    private readonly _cache;
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
    });
    getCached<T>(key: string, fetchFn: () => Promise<T>): Promise<{
        value: T;
        hit: boolean;
    }>;
    getCache(): VerificationCache;
}
