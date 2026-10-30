"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialResolverService = void 0;
const SecretResolverService_1 = require("./secret-management/SecretResolverService");
class CredentialResolverService {
    static async resolve(provider) {
        // Perform Vault resolution. If the secret is RETIRED or COMPROMISED, SecretResolverService throws.
        const secretValue = await SecretResolverService_1.SecretResolverService.resolve(provider);
        // Keep active mock metadata for downstream signature/adapter usages
        return {
            id: `cred-${provider.toLowerCase()}`,
            provider,
            keyVersion: 'v1.0.0',
            publicKey: `pubkey-${provider.toLowerCase()}`,
            vaultKeyReference: `vault:${provider.toLowerCase()}:secret`,
            status: 'ACTIVE'
        };
    }
}
exports.CredentialResolverService = CredentialResolverService;
//# sourceMappingURL=credential-resolver.service.js.map