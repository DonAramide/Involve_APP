// src/services/financial-verification/modules/settlement/SettlementVerificationService.ts

import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";

export class SettlementVerificationService implements FinancialVerificationModule {
  public readonly moduleId = 'settlement_verification';
  public readonly domain = 'Settlement';
  public readonly priority = 70;
  public readonly mandatory = true;
  public readonly version = '1.0.0';
  public readonly capabilities = ['settlement.account', 'settlement.eligibility'];

  public async verify(context: VerificationContext): Promise<VerificationResult> {
    // Check settlement currency
    if (context.currency !== 'NGN' && context.currency !== 'USD') {
      return {
        passed: false,
        error: `Settlement currency ${context.currency} is not eligible. Only NGN or USD allowed.`,
      };
    }

    if (context.metadata?.test_settlement_window_closed === true) {
      return {
        passed: false,
        error: `Settlement window is closed.`,
      };
    }

    return {
      passed: true
    };
  }
}
