export declare class IntegrationVaultService {
    /**
     * Registers a new integration in the vault.
     */
    static registerIntegration(payload: {
        service_identifier: string;
        name: string;
        description?: string;
        category: string;
        scope: 'GLOBAL' | 'TENANT';
        tenant_id?: string | null;
    }): Promise<any>;
    /**
     * Retrieves all integrations with their current health and active credentials.
     */
    static listIntegrations(scope?: 'GLOBAL' | 'TENANT', tenantId?: string): Promise<any[]>;
    /**
     * Adds a new credential, optionally rotating out the old one.
     */
    static addCredential(vaultId: string, payload: {
        credential_type: string;
        environment: string;
        plaintext_value: string;
        key_name: string;
        expires_at?: string;
        operator_id?: string;
        rotate_existing?: boolean;
    }): Promise<any>;
    /**
     * INTERNAL: Retrieves and decrypts an active credential. Never exposed to API directly.
     */
    static getDecryptedCredential(serviceIdentifier: string, environment?: string, tenantId?: string, keyName?: string): Promise<string | null>;
    /**
     * Promotes a STANDBY credential to ACTIVE and demotes any existing ACTIVE credential for the same key_name and environment.
     */
    static activateCredential(vaultId: string, credentialId: string): Promise<any>;
    /**
     * Hard deletes a credential from the vault.
     */
    static deleteCredential(vaultId: string, credentialId: string): Promise<boolean>;
    /**
     * Logs a health check result.
     */
    static logHealthCheck(vaultId: string, environment: string, status: 'HEALTHY' | 'DEGRADED' | 'DOWN', latencyMs: number, errorMessage?: string): Promise<void>;
}
