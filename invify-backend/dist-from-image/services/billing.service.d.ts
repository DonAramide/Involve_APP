export declare class BillingService {
    /**
     * Checks if a tenant has remaining AI quota for the current billing cycle.
     */
    static checkQuota(tenantId: string): Promise<{
        allowed: boolean;
        remaining: number;
        plan: string;
    }>;
    /**
     * Detailed billing status for the UI.
     */
    static getBillingStatus(tenantId: string): Promise<{
        plan: any;
        status: any;
        expiry: any;
        limit: any;
        usage: number;
        percentage: number;
        features: any;
    }>;
}
