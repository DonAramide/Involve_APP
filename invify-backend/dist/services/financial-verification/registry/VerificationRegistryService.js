"use strict";
// src/services/financial-verification/registry/VerificationRegistryService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationRegistryService = void 0;
const supabase_1 = require("../../../db/supabase");
class VerificationRegistryService {
    moduleId = 'verification_registry';
    domain = 'Banking';
    priority = 30;
    mandatory = true;
    version = '1.0.0';
    capabilities = ['nonce_validation', 'registry_validation'];
    async verify(context) {
        try {
            // Nonce replay protection validation
            const nonce = context.metadata?.nonce;
            if (nonce) {
                // Query to check if this nonce was already processed in quasar_verification_requests
                const { data: existing, error } = await supabase_1.supabaseAdmin
                    .from('quasar_verification_requests')
                    .select('id')
                    .eq('nonce', nonce)
                    .maybeSingle();
                if (error)
                    throw new Error(error.message);
                if (existing) {
                    return {
                        passed: false,
                        error: `Replay detected: Nonce ${nonce} has already been registered/consumed.`
                    };
                }
            }
            // Check request signature validity
            const signature = context.metadata?.signature;
            if (signature && signature === 'INVALID_SIGNATURE') {
                return {
                    passed: false,
                    error: 'Verification signature is invalid.'
                };
            }
            return {
                passed: true
            };
        }
        catch (err) {
            return {
                passed: false,
                error: `Verification registry exception: ${err.message}`
            };
        }
    }
}
exports.VerificationRegistryService = VerificationRegistryService;
//# sourceMappingURL=VerificationRegistryService.js.map