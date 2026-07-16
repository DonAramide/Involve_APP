"use strict";
// src/services/financial-verification/modules/liquidity/LiquidityVerificationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiquidityVerificationService = void 0;
class LiquidityVerificationService {
    moduleId = 'liquidity_verification';
    domain = 'Treasury';
    priority = 80;
    mandatory = true;
    version = '1.0.0';
    capabilities = ['liquidity.treasury', 'liquidity.provider', 'liquidity.limits'];
    async verify(context) {
        const dailyLimit = 1000000; // ₦1,000,000 daily limit for standard accounts
        if (context.amount > dailyLimit || context.metadata?.test_force_liquidity_fail === true) {
            return {
                passed: false,
                error: `Daily Treasury Limit Exceeded. Max: ₦${dailyLimit}, Requested: ₦${context.amount}`,
            };
        }
        if (context.provider === 'UNAVAILABLE_PROVIDER') {
            return {
                passed: false,
                error: `Provider capacity check failed for ${context.provider}: insufficient provider liquidity.`,
            };
        }
        return {
            passed: true
        };
    }
}
exports.LiquidityVerificationService = LiquidityVerificationService;
//# sourceMappingURL=LiquidityVerificationService.js.map