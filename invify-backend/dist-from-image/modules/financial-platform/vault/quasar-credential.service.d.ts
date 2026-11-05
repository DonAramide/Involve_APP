export interface QuasarCredentials {
    apiKey: string;
    clientSecret: string;
    webhookSigningSecret: string;
}
export interface QuasarCredentialReferences {
    apiKeyUrn: string;
    clientSecretUrn: string;
    webhookSigningSecretUrn: string;
}
export declare class QuasarCredentialService {
    /**
     * Stores raw credentials securely in Vault and returns their URN references.
     * The actual Vault implementation is encapsulated behind this service.
     */
    storeCredentials(tenantId: string, credentials: QuasarCredentials): Promise<QuasarCredentialReferences>;
    rotateCredentials(tenantId: string, newCredentials: QuasarCredentials): Promise<QuasarCredentialReferences>;
    deleteCredentials(tenantId: string): Promise<void>;
    getCredentialReferences(tenantId: string): Promise<QuasarCredentialReferences>;
}
