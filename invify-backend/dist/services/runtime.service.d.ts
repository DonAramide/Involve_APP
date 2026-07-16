export interface TenantRuntimeConfig {
    tenant: {
        id: string;
        name: string;
        businessMode: string;
        status: string;
        version: string;
    };
    subscription: {
        tier: string;
        status: string;
        validUntil: string;
    };
    capabilities: {
        quasarEnabled: boolean;
        multiBranch: boolean;
        advancedReports: boolean;
        offlineMode: boolean;
        apiAccess: boolean;
    };
    quotas: {
        maxTerminals: number;
        activeTerminals: number;
    };
    integrations: {
        whatsapp: boolean;
        smtp: boolean;
        paymentProviders: string[];
    };
    branding: {
        primaryColor: string;
        logoUrl: string;
        receiptFooter: string;
        invoiceFooter: string;
    };
    realtime: {
        channels: string[];
    };
}
export declare class RuntimeConfigService {
    /**
     * Fetches the complete runtime configuration for a tenant.
     * Completely UI-agnostic. Deals only with data capabilities.
     */
    static getConfig(tenantId: string): Promise<TenantRuntimeConfig>;
}
