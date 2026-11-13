"use strict";
// invify-backend/src/modules/financial-platform/infrastructure/CredentialProvider.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultCredentialProvider = void 0;
class VaultCredentialProvider {
    vaultClient;
    constructor(vaultClient) {
        this.vaultClient = vaultClient;
    }
    async getPlatformCredentials(vertical) {
        const normalized = String(vertical || 'invify_retail').trim().toLowerCase() || 'invify_retail';
        // Prefer vertical-specific vault key, then legacy shared key
        const creds = (await this.vaultClient.read(`quasarPlatform:${normalized}`)) ||
            (await this.vaultClient.read('quasarPlatform'));
        if (!creds || !creds.clientId || !creds.clientSecret) {
            throw new Error(`Quasar Platform credentials not found for vertical "${normalized}". ` +
                `Set INVIFY_SCHOOL_CLIENT_ID/SECRET (or retail/services) in .env / QIP vault.`);
        }
        return {
            clientId: creds.clientId,
            clientSecret: creds.clientSecret,
        };
    }
    async getTenantCredentials(tenantId) {
        const creds = await this.vaultClient.read(`quasarTenant/${tenantId}`);
        if (!creds || !creds.apiKeySecret) {
            throw new Error(`Quasar credentials not found for tenant ${tenantId}`);
        }
        return {
            secretKey: creds.apiKeySecret,
            environment: creds.environment,
        };
    }
}
exports.VaultCredentialProvider = VaultCredentialProvider;
//# sourceMappingURL=CredentialProvider.js.map