// src/services/financial-verification/modules/treasury/TreasuryVerificationService.ts

import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
import { supabaseAdmin } from "../../../../db/supabase";

export class TreasuryVerificationService implements FinancialVerificationModule {
  public readonly moduleId = 'treasury_verification';
  public readonly domain = 'Treasury';
  public readonly priority = 100;
  public readonly mandatory = true;
  public readonly version = '1.0.0';
  public readonly capabilities = ['treasury.exists', 'treasury.active', 'treasury.policy', 'treasury.limits'];

  public async verify(context: VerificationContext): Promise<VerificationResult> {
    try {
      const { value: tenant, hit } = await context.getCached(`tenant_${context.tenantId}`, async () => {
        const { data, error } = await supabaseAdmin
          .from('tenants')
          .select('*')
          .eq('id', context.tenantId)
          .maybeSingle();

        if (error) throw new Error(error.message);
        return data;
      });

      if (!tenant) {
        return {
          passed: false,
          error: `Treasury account (Tenant ${context.tenantId}) does not exist.`,
          metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
        };
      }

      if (tenant.status !== 'active') {
        return {
          passed: false,
          error: `Treasury account (Tenant ${context.tenantId}) is not active. Status: ${tenant.status}`,
          metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
        };
      }

      // Check Treasury Policy & limits
      if (context.amount > 5000000) {
        return {
          passed: false,
          error: `Transaction amount exceeds single treasury transfer limit of ₦5,000,000.`,
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
        error: `Treasury verification exception: ${err.message}`
      };
    }
  }
}
