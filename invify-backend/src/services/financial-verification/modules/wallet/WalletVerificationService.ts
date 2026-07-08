// src/services/financial-verification/modules/wallet/WalletVerificationService.ts

import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
import { supabaseAdmin } from "../../../../db/supabase";

export class WalletVerificationService implements FinancialVerificationModule {
  public readonly moduleId = 'wallet_verification';
  public readonly domain = 'Wallet';
  public readonly priority = 90;
  public readonly mandatory = true;
  public readonly version = '1.0.0';
  public readonly capabilities = ['wallet.exists', 'wallet.active', 'wallet.currency', 'wallet.owner'];

  public async verify(context: VerificationContext): Promise<VerificationResult> {
    try {
      const { value: wallet, hit } = await context.getCached(`wallet_${context.tenantId}_${context.currency}`, async () => {
        const { data, error } = await supabaseAdmin
          .from('wallets')
          .select('*')
          .eq('tenant_id', context.tenantId)
          .eq('currency', context.currency)
          .maybeSingle();

        if (error) throw new Error(error.message);
        return data;
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
    } catch (err: any) {
      return {
        passed: false,
        error: `Wallet verification exception: ${err.message}`
      };
    }
  }
}
