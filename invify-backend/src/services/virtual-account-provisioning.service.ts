import { BankingGatewayService } from './banking-gateway.service';
import { supabaseAdmin } from '../db/supabase';

export class VirtualAccountProvisioningService {
  static async provision(params: {
    tenantId: string;
    accountType: 'STATIC' | 'DYNAMIC';
    accountName: string;
    financialEventId?: string;
  }): Promise<{ accountNumber: string; bankName: string; expiresAt?: string; provider: string }> {
    const result = await BankingGatewayService.provisionVirtualAccount({
      tenantId: params.tenantId,
      accountType: params.accountType,
      accountName: params.accountName
    });

    // Record virtual account mapping in DB
    const { error } = await supabaseAdmin.from('virtual_accounts').insert({
      tenant_id: params.tenantId,
      account_number: result.accountNumber,
      bank_name: result.bankName,
      account_name: params.accountName,
      provider: result.provider,
      is_active: true,
      expires_at: result.expiresAt || null,
      financial_event_id: params.financialEventId || null
    });

    if (error) {
      throw new Error(`Failed to save virtual account: ${error.message}`);
    }

    return result;
  }
}
