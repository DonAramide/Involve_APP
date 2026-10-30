/**
 * Interface for fetching Quasar credentials, abstracting the underlying
 * secure storage (Vault, ECS, AWS Secrets Manager, etc.)
 */
export interface CredentialProvider {
    /**
     * Fetches the platform-level client ID and secret for a Quasar vertical.
     * Quasar partners are vertical-scoped: INVIFY_RETAIL may only create invify_retail,
     * INVIFY_SCHOOL only invify_school, etc.
     */
    getPlatformCredentials(vertical?: string): Promise<{
        clientId: string;
        clientSecret: string;
    }>;
    /**
     * Fetches the tenant-specific secret key (sk_*).
     * Used strictly for payment operations on behalf of a specific merchant.
     */
    getTenantCredentials(tenantId: string): Promise<{
        secretKey: string;
        publicKey?: string;
        environment?: string;
    }>;
}
export declare class VaultCredentialProvider implements CredentialProvider {
    private vaultClient;
    constructor(vaultClient: any);
    getPlatformCredentials(vertical?: string): Promise<{
        clientId: string;
        clientSecret: string;
    }>;
    getTenantCredentials(tenantId: string): Promise<{
        secretKey: string;
        publicKey?: string;
        environment?: string;
    }>;
}
