export declare class VirtualAccountProvisioningService {
    static provision(params: {
        tenantId: string;
        accountType: 'STATIC' | 'DYNAMIC';
        accountName: string;
        financialEventId?: string;
    }): Promise<{
        accountNumber: string;
        bankName: string;
        expiresAt?: string;
        provider: string;
    }>;
}
