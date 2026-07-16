export interface ProviderSecretVersion {
    id: string;
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
    key_version: string;
    vault_key_reference: string;
    status: 'ACTIVE' | 'ROTATING' | 'RETIRED' | 'COMPROMISED' | 'REVOKED';
    environment: string;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
}
export interface ProviderSecretAudit {
    id: string;
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA' | null;
    key_version: string | null;
    action: 'READ' | 'ROTATE' | 'REVOKE' | 'ERROR';
    operator: string;
    status: 'SUCCESS' | 'FAILED';
    details: string;
    created_at: string;
}
export interface ProviderSecretRotationJob {
    id: string;
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    scheduled_at: string;
    executed_at: string | null;
    error_message: string | null;
    created_at: string;
}
export declare class SecretDatabaseService {
    private static inMemoryVersions;
    private static inMemoryAudits;
    private static inMemoryRotationJobs;
    private static useInMemory;
    static clearInMemoryData(): void;
    static getVersions(provider: string, env: string): Promise<ProviderSecretVersion[]>;
    static insertVersion(version: Partial<ProviderSecretVersion>): Promise<ProviderSecretVersion>;
    static updateVersion(id: string, updates: Partial<ProviderSecretVersion>): Promise<void>;
    static insertAudit(audit: Partial<ProviderSecretAudit>): Promise<ProviderSecretAudit>;
    static getAudits(): Promise<ProviderSecretAudit[]>;
    static insertRotationJob(job: Partial<ProviderSecretRotationJob>): Promise<ProviderSecretRotationJob>;
    static updateRotationJob(id: string, updates: Partial<ProviderSecretRotationJob>): Promise<void>;
    static getRotationJobs(): Promise<ProviderSecretRotationJob[]>;
}
