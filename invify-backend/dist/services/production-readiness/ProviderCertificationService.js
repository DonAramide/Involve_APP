"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderCertificationService = void 0;
class ProviderCertificationService {
    static certs = {
        PAYSTACK: { provider: 'PAYSTACK', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
        FLUTTERWAVE: { provider: 'FLUTTERWAVE', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
        PROVIDUS: { provider: 'PROVIDUS', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
        WEMA: { provider: 'WEMA', providerReady: true, vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' }
    };
    static clearState() {
        this.certs = {
            PAYSTACK: { provider: 'PAYSTACK', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
            FLUTTERWAVE: { provider: 'FLUTTERWAVE', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
            PROVIDUS: { provider: 'PROVIDUS', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
            WEMA: { provider: 'WEMA', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' }
        };
    }
    static getCertification(provider) {
        return this.certs[provider];
    }
    static updateCertification(provider, updates) {
        this.certs[provider] = { ...this.certs[provider], ...updates };
    }
    static verifyAndCanExecute(provider) {
        const cert = this.certs[provider];
        if (!cert)
            return false;
        return cert.vaultReady && cert.configured && cert.healthy && cert.certified && cert.allowed && cert.status === 'ACTIVE';
    }
}
exports.ProviderCertificationService = ProviderCertificationService;
//# sourceMappingURL=ProviderCertificationService.js.map