"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarCredentialService = void 0;
class QuasarCredentialService {
    /**
     * Stores raw credentials securely in Vault and returns their URN references.
     * The actual Vault implementation is encapsulated behind this service.
     */
    async storeCredentials(tenantId, credentials) {
        // In a real implementation, this would call the internal Vault service.
        // For now, we simulate writing to Vault and returning URNs.
        return {
            apiKeyUrn: `vault://invify/quasar/${tenantId}/api_key`,
            clientSecretUrn: `vault://invify/quasar/${tenantId}/client_secret`,
            webhookSigningSecretUrn: `vault://invify/quasar/${tenantId}/webhook_secret`
        };
    }
    async rotateCredentials(tenantId, newCredentials) {
        throw new Error('Method not implemented yet');
    }
    async deleteCredentials(tenantId) {
        throw new Error('Method not implemented yet');
    }
    async getCredentialReferences(tenantId) {
        throw new Error('Method not implemented yet');
    }
}
exports.QuasarCredentialService = QuasarCredentialService;
//# sourceMappingURL=quasar-credential.service.js.map