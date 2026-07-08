// src/services/financial-verification/modules/registry/VerificationRegistryService.ts

import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
import { supabaseAdmin } from "../../../../db/supabase";

export class VerificationRegistryService implements FinancialVerificationModule {
  public readonly moduleId = 'verification_registry';
  public readonly domain = 'Banking';
  public readonly priority = 30;
  public readonly mandatory = true;
  public readonly version = '1.0.0';
  public readonly capabilities = ['registry.nonce'];

  public async verify(context: VerificationContext): Promise<VerificationResult> {
    try {
      // Nonce replay protection validation
      const nonce = context.metadata?.nonce;
      if (nonce) {
        // Query to check if this nonce was already processed in quasar_verification_requests
        const { data: existing, error } = await supabaseAdmin
          .from('quasar_verification_requests')
          .select('id, financial_event_id')
          .eq('nonce', nonce)
          .maybeSingle();

        if (error) throw new Error(error.message);

        if (existing && existing.financial_event_id !== context.financialEventId) {
          return {
            passed: false,
            error: `Replay detected: Nonce ${nonce} has already been registered/consumed by another transaction.`
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
    } catch (err: any) {
      return {
        passed: false,
        error: `Verification registry exception: ${err.message}`
      };
    }
  }
}
