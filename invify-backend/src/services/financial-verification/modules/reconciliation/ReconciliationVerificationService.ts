// src/services/financial-verification/modules/reconciliation/ReconciliationVerificationService.ts

import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";

export class ReconciliationVerificationService implements FinancialVerificationModule {
  public readonly moduleId = 'reconciliation_verification';
  public readonly domain = 'Reconciliation';
  public readonly priority = 60;
  public readonly mandatory = true;
  public readonly version = '1.0.0';
  public readonly capabilities = ['reconciliation.amount'];

  public async verify(context: VerificationContext): Promise<VerificationResult> {
    // If webhook/inbound metadata contains discrepancies, flag them
    const providerAmount = context.metadata?.providerAmount ?? context.amount;
    const internalAmount = context.amount;

    if (providerAmount !== internalAmount) {
      return {
        passed: false,
        error: `Reconciliation discrepancy: provider amount (₦${providerAmount}) does not match internal expected amount (₦${internalAmount}).`,
      };
    }

    return {
      passed: true
    };
  }
}
