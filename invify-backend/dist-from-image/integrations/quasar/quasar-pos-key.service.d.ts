export interface RotatePosKeyResult {
    invifyTenantId: string | null;
    quasarTenantId: string;
    keyVersion: number;
    /** Returned once — never re-fetched from Quasar */
    encryptionKeyBase64: string;
    fingerprint: string;
    stored: {
        tenantVault: boolean;
        globalSettings: boolean;
        runtimeEnv: boolean;
    };
    warning: string;
}
/** Ping Quasar admin login using vault/env or override credentials. */
export declare function testQuasarAdminLogin(params?: {
    username?: string;
    password?: string;
}): Promise<{
    ok: boolean;
    quasarBaseUrl: string;
    username: string;
    latencyMs: number;
    message: string;
}>;
export declare class QuasarPosKeyService {
    static getStatus(invifyTenantId?: string | null): Promise<{
        configured: boolean;
        globalConfigured: boolean;
        sources: {
            tenantVault: boolean;
            globalSettings: boolean;
            runtimeEnv: boolean;
        };
        invifyTenantId: string | null;
        quasarTenantId: string | null;
        quasarBaseUrl: string;
    }>;
    /**
     * Rotate on Quasar and store on Invify (tenant vault + optional platform default).
     */
    static rotateAndStore(params: {
        invifyTenantId?: string;
        quasarTenantId?: string;
        adminJwt?: string;
        /** Also write global_settings + process.env for platform-wide fallback */
        applyAsPlatformDefault?: boolean;
        operatorId?: string;
    }): Promise<RotatePosKeyResult>;
    /** Manual paste path — store a key already rotated outside Invify. */
    static storeExistingKey(params: {
        encryptionKeyBase64: string;
        invifyTenantId?: string;
        applyAsPlatformDefault?: boolean;
    }): Promise<Omit<RotatePosKeyResult, 'keyVersion'> & {
        keyVersion: number | null;
    }>;
}
