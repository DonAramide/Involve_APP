// src/services/financial-verification/modules/liquidity/LiquidityVerificationService.ts

import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";

export class LiquidityVerificationService implements FinancialVerificationModule {
  public readonly moduleId = 'liquidity_verification';
  public readonly domain = 'Treasury';
  public readonly priority = 80;
  public readonly mandatory = true;
  public readonly version = '1.0.0';
  public readonly capabilities = ['liquidity.treasury', 'liquidity.provider', 'liquidity.limits'];

  public async verify(context: VerificationContext): Promise<VerificationResult> {
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
