"use strict";
// src/services/financial-verification/modules/wallet/WalletVerificationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletVerificationService = void 0;
const supabase_1 = require("../../../../db/supabase");
const wallet_service_1 = require("../../../wallet.service");
class WalletVerificationService {
    moduleId = 'wallet_verification';
    domain = 'Wallet';
    priority = 90;
    mandatory = true;
    version = '1.0.0';
    capabilities = ['wallet.exists', 'wallet.active', 'wallet.currency', 'wallet.owner'];
    async verify(context) {
        try {
            const { value: wallet, hit } = await context.getCached(`wallet_${context.tenantId}_${context.currency}`, async () => {
                const { data, error } = await supabase_1.supabaseAdmin
                    .from('wallets')
                    .select('*')
                    .eq('tenant_id', context.tenantId)
                    .limit(1)
                    .maybeSingle();
                if (error)
                    throw new Error(error.message);
                if (data)
                    return data;
                return wallet_service_1.WalletService.ensureWallet(context.tenantId, context.currency || 'NGN');
            });
            if (!wallet) {
                return {
                    passed: false,
                    error: `Wallet not found for tenant: ${context.tenantId} in currency: ${context.currency}`,
                    metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
                };
            }
            // Check balance if checking outbound limits
            if (context.amount > 0 && wallet.balance < context.amount) {
                return {
                    passed: false,
                    error: `Insufficient wallet balance. Available: ₦${wallet.balance}, Requested: ₦${context.amount}`,
                    metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
                };
            }
            return {
                passed: true,
                metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
            };
        }
        catch (err) {
            return {
                passed: false,
                error: `Wallet verification exception: ${err.message}`
            };
        }
    }
}
exports.WalletVerificationService = WalletVerificationService;
//# sourceMappingURL=WalletVerificationService.js.map