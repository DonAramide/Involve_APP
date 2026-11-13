export declare class QuasarLiveKeyService {
    /**
     * Issue sk_live_* on Quasar for this Invify tenant and store it in
     * quasar_integrations + Integration Vault (apiKeySecret).
     */
    static issueAndStore(params: {
        invifyTenantId: string;
        operatorId?: string;
    }): Promise<{
        invifyTenantId: string;
        quasarTenantId: string;
        environment: 'live';
        keyPrefix: string;
        fingerprint: string;
        scopes: string[];
    }>;
    /** Safe status for UI — never returns the secret. */
    static getStatus(invifyTenantId: string): Promise<{
        configured: boolean;
        environment: string | null;
        keyPrefix: string | null;
        quasarTenantId: string | null;
        vaultHasApiKey: boolean;
    }>;
}
