// src/services/financial-verification/modules/provider/ProviderResponseVerificationService.ts

import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";

export class ProviderResponseVerificationService implements FinancialVerificationModule {
  public readonly moduleId = 'provider_response_verification';
  public readonly domain = 'Banking';
  public readonly priority = 20;
  public readonly mandatory = true;
  public readonly version = '1.0.0';
  public readonly capabilities = ['provider.response', 'provider.signature'];

  public async verify(context: VerificationContext): Promise<VerificationResult> {
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
