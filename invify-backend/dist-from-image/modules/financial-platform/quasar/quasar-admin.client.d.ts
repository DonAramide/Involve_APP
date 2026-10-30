export interface ProvisionTenantRequest {
    businessName: string;
    email: string;
    environment: 'sandbox' | 'production';
}
export interface ProvisionTenantResponse {
    tenantId: string;
    apiKey: string;
    clientSecret: string;
    webhookSigningSecret: string;
}
export declare class QuasarAdminClient {
    private client;
    constructor();
    createTenant(payload: ProvisionTenantRequest): Promise<ProvisionTenantResponse>;
    rotateCredentials(quasarTenantId: string): Promise<{
        apiKey: string;
        clientSecret: string;
        webhookSigningSecret: string;
    }>;
    suspendTenant(quasarTenantId: string): Promise<void>;
    reactivateTenant(quasarTenantId: string): Promise<void>;
    deleteTenant(quasarTenantId: string): Promise<void>;
    getHealth(): Promise<boolean>;
}
