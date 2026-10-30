"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretResolverService = void 0;
const SecretCache_1 = require("./SecretCache");
const SecretDatabaseService_1 = require("./SecretDatabaseService");
const SecretAuditService_1 = require("./SecretAuditService");
class SecretResolverService {
    static cache = new SecretCache_1.SecretCache();
    static providers = [];
    static registerProvider(provider) {
        // Prevent duplicate registrations of the same provider type
        this.providers = this.providers.filter(p => p.providerId !== provider.providerId);
        this.providers.push(provider);
    }
    static getRegisteredProviders() {
        return this.providers;
    }
    static clearProviders() {
        this.providers = [];
    }
    static getCache() {
        return this.cache;
    }
    static async resolve(provider, operator = 'system') {
        const env = process.env.APP_ENV || process.env.NODE_ENV || 'staging';
        // 1. Fetch versions from database
        const versions = await SecretDatabaseService_1.SecretDatabaseService.getVersions(provider, env);
        const activeVersion = versions.find(v => v.is_active && (v.status === 'ACTIVE' || v.status === 'ROTATING'));
        if (!activeVersion) {
            // Look for a version that might be compromised/revoked, sorting by creation date desc and severity
            const sortedInvalids = [...versions].sort((a, b) => {
                const severity = { REVOKED: 3, COMPROMISED: 2, RETIRED: 1, ACTIVE: 0, ROTATING: 0 };
                const sevA = severity[a.status] || 0;
                const sevB = severity[b.status] || 0;
                if (sevA !== sevB)
                    return sevB - sevA;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            const invalidVersion = sortedInvalids[0];
            if (invalidVersion && invalidVersion.status !== 'ACTIVE' && invalidVersion.status !== 'ROTATING') {
                await SecretAuditService_1.SecretAuditService.log('ERROR', provider, invalidVersion.key_version, 'FAILED', `Failed to resolve: Secret version is in ${invalidVersion.status} state`, operator);
                throw new Error(`Credentials for ${provider} in ${env} are ${invalidVersion.status}`);
            }
            await SecretAuditService_1.SecretAuditService.log('ERROR', provider, null, 'FAILED', `No active or rotating credentials found in environment ${env}`, operator);
            throw new Error(`No active or rotating credentials found for ${provider} in environment ${env}`);
        }
        return this.resolveVersion(activeVersion, operator);
    }
    static async resolveVersion(version, operator = 'system') {
        const provider = version.provider;
        const keyVersion = version.key_version;
        const ref = version.vault_key_reference;
        // 1. Check Cache
        const cached = this.cache.get(ref);
        if (cached) {
            // Log audit for cached read
            await SecretAuditService_1.SecretAuditService.log('READ', provider, keyVersion, 'SUCCESS', 'Secret resolved from cache', operator);
            return cached;
        }
        // 2. Expiry check
        if (version.expires_at && new Date() > new Date(version.expires_at)) {
            await SecretAuditService_1.SecretAuditService.log('ERROR', provider, keyVersion, 'FAILED', `Secret expired at ${version.expires_at}`, operator);
            throw new Error(`Credentials for ${provider} are EXPIRED`);
        }
        // 3. Status checks (revocation/compromised)
        if (version.status === 'REVOKED') {
            await SecretAuditService_1.SecretAuditService.log('ERROR', provider, keyVersion, 'FAILED', 'Attempted to resolve a REVOKED secret', operator);
            throw new Error(`Credentials for ${provider} are REVOKED`);
        }
        if (version.status === 'COMPROMISED') {
            await SecretAuditService_1.SecretAuditService.log('ERROR', provider, keyVersion, 'FAILED', 'Attempted to resolve a COMPROMISED secret', operator);
            throw new Error(`Credentials for ${provider} are COMPROMISED`);
        }
        // 4. Resolve via vault providers with chain failover (KMS Failover)
        if (this.providers.length === 0) {
            const errMsg = 'No vault providers registered in SecretResolverService';
            await SecretAuditService_1.SecretAuditService.log('ERROR', provider, keyVersion, 'FAILED', errMsg, operator);
            throw new Error(errMsg);
        }
        let lastError = null;
        for (const vault of this.providers) {
            try {
                const secretValue = await vault.retrieveSecret(ref);
                // Successful retrieval: cache it, audit log it, return it.
                this.cache.set(ref, secretValue);
                await SecretAuditService_1.SecretAuditService.log('READ', provider, keyVersion, 'SUCCESS', `Secret resolved successfully from ${vault.providerId}`, operator);
                return secretValue;
            }
            catch (err) {
                lastError = err;
                // Log individual provider failure (failover warning)
                await SecretAuditService_1.SecretAuditService.log('ERROR', provider, keyVersion, 'FAILED', `Failed retrieval from ${vault.providerId}: ${err.message}`, operator);
            }
        }
        // If all providers failed
        const errorMsg = `KMS Failover exhausted. All providers failed to resolve secret: ${lastError?.message}`;
        await SecretAuditService_1.SecretAuditService.log('ERROR', provider, keyVersion, 'FAILED', errorMsg, operator);
        throw new Error(errorMsg);
    }
}
exports.SecretResolverService = SecretResolverService;
//# sourceMappingURL=SecretResolverService.js.map