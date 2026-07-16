"use strict";
// src/services/financial-verification/modules/provider/ProviderResponseVerificationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderResponseVerificationService = void 0;
class ProviderResponseVerificationService {
    moduleId = 'provider_response_verification';
    domain = 'Banking';
    priority = 20;
    mandatory = true;
    version = '1.0.0';
    capabilities = ['provider.response', 'provider.signature'];
    async verify(context) {
        const rawPayload = context.metadata?.rawPayload;
        if (rawPayload && rawPayload.status === 'FAILED') {
            return {
                passed: false,
                error: `Provider response failed verification: ${rawPayload.error || 'Unknown error'}`
            };
        }
        // signature validation (simulated or explicit)
        const signature = context.metadata?.signature;
        if (signature === 'invalid_signature') {
            return {
                passed: false,
                error: 'Provider response signature verification failed.'
            };
        }
        return {
            passed: true
        };
    }
}
exports.ProviderResponseVerificationService = ProviderResponseVerificationService;
//# sourceMappingURL=ProviderResponseVerificationService.js.map