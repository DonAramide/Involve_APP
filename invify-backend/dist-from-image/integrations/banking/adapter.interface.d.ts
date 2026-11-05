export interface BankingProviderAdapter {
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
    provisionVirtualAccount(params: {
        tenantId: string;
        accountType: 'STATIC' | 'DYNAMIC';
        accountName: string;
    }): Promise<{
        accountNumber: string;
        bankName: string;
        expiresAt?: string;
    }>;
    nameEnquiry(params: {
        bankCode: string;
        accountNumber: string;
    }): Promise<{
        accountName: string;
        isVerified: boolean;
    }>;
    executeTransfer(params: {
        transferLogId: string;
        amount: number;
        fee: number;
        beneficiaryBankCode: string;
        beneficiaryAccountNumber: string;
    }): Promise<{
        providerReference: string;
        status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'TIMEOUT';
    }>;
    checkTransferStatus(reference: string): Promise<{
        status: 'SUCCESS' | 'FAILED' | 'PENDING';
    }>;
    validateWebhook(payload: any, signature: string): Promise<boolean>;
    getHealthMetrics(): Promise<{
        latencyMs: number;
        errorRate: number;
    }>;
}
