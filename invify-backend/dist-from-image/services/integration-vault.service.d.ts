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
    static getDecryptedCredential(serviceIdentifier: string, environment?: string, tenantId?: string, keyName?: string, options?: {
        allowStandby?: boolean;
    }): Promise<string | null>;
    /**
     * Promotes a STANDBY credential to ACTIVE and demotes any existing ACTIVE credential for the same key_name and environment.
     */
    static activateCredential(vaultId: string, credentialId: string): Promise<any>;
    /**
     * Updates an existing credential in place (name, type, expiry, and/or secret).
     * Does not create a new version. Optional promote flips STANDBY → ACTIVE.
     */
    static updateCredential(vaultId: string, credentialId: string, payload: {
        credential_type?: string;
        key_name?: string;
        expires_at?: string | null;
        plaintext_value?: string;
        promote?: boolean;
    }): Promise<any>;
    /**
     * Hard deletes a credential from the vault.
     */
    static deleteCredential(vaultId: string, credentialId: string): Promise<boolean>;
    /**
     * Logs a health check result.
     */
    static logHealthCheck(vaultId: string, environment: string, status: 'HEALTHY' | 'DEGRADED' | 'DOWN', latencyMs: number, errorMessage?: string): Promise<void>;
    /**
     * Ensures the global Quasar vault integration exists and stores/rotates the
     * outbound webhook HMAC signing secret (from Quasar Outbound webhook defaults).
     */
    static upsertQuasarWebhookSigningSecret(signingSecret: string, environment?: string): Promise<{
        vaultId: string | null;
        keyName: string;
        environment: string;
    }>;
    /**
     * Status-only check for Quasar webhook signing secret (never returns plaintext).
     */
    static getQuasarWebhookSecretStatus(environment?: string): Promise<{
        configured: boolean;
        sources: {
            runtimeEnv: boolean;
            integrationVault: boolean;
        };
        environment: string;
        header: string;
    }>;
    /**
     * Ensure global Quasar vault exists and store admin username + password
     * for POS encryption key rotate (Quasar /admin/auth/login).
     */
    static upsertQuasarAdminCredentials(params: {
        username: string;
        password: string;
    }, environment?: string): Promise<{
        vaultId: string | null;
        environment: string;
        keys: string[];
    }>;
    /** Status-only — never returns password. */
    static getQuasarAdminCredentialsStatus(environment?: string): Promise<{
        configured: boolean;
        sources: {
            runtimeEnv: boolean;
            integrationVault: boolean;
            adminJwtEnv: boolean;
        };
        environment: string;
        usernameConfigured: boolean;
        passwordConfigured: boolean;
    }>;
    /** Decrypt Quasar admin login pair for server-side use only. */
    static getQuasarAdminCredentials(environment?: string): Promise<{
        username: string;
        password: string;
    } | null>;
    static readonly META_WHATSAPP_SERVICE = "META_WHATSAPP";
    static readonly META_WHATSAPP_KEYS: readonly ["PUBLIC_API_BASE_URL", "WHATSAPP_GRAPH_API_VERSION", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_APP_SECRET", "WHATSAPP_WEBHOOK_VERIFY_TOKEN", "WHATSAPP_BUSINESS_ACCOUNT_ID", "WHATSAPP_PHONE_NUMBER_ID"];
    static ensureMetaWhatsAppVault(): Promise<string>;
    /**
     * Upsert Meta WhatsApp Cloud API config into Integration Vault.
     * Only non-empty provided keys are written (partial updates allowed).
     * Also hydrates process.env for immediate use without restart.
     */
    static upsertMetaWhatsAppCredentials(values: Partial<Record<(typeof IntegrationVaultService.META_WHATSAPP_KEYS)[number], string>>, environment?: string): Promise<{
        vaultId: string;
        environment: string;
        keys: string[];
    }>;
    /** Status-only — never returns secrets. */
    static getMetaWhatsAppStatus(environment?: string): Promise<{
        serviceIdentifier: string;
        environment: string;
        ready: boolean;
        keys: Record<string, {
            configured: boolean;
            sources: {
                runtimeEnv: boolean;
                integrationVault: boolean;
            };
        }>;
        webhookPath: string;
    }>;
    /**
     * Copy ACTIVE vault values into process.env when env is empty.
     * Safe to call at boot — never logs secret values.
     */
    static hydrateMetaWhatsAppFromVault(environment?: string): Promise<string[]>;
}
