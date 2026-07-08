import { BankingProviderAdapter } from './adapter.interface';
import { CredentialResolverService } from '../../services/credential-resolver.service';
import { SandboxBankingSimulationService } from '../../services/sandbox-simulation.service';
import { supabaseAdmin } from '../../db/supabase';
import * as crypto from 'crypto';

export class PaystackAdapter implements BankingProviderAdapter {
  provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA' = 'PAYSTACK';

  private async audit(requestType: string, capability: string, requestPayload: any, responsePayload: any, statusCode: number, financialEventId?: string) {
    const reqStr = JSON.stringify(requestPayload);
    const resStr = JSON.stringify(responsePayload);
    const reqHash = crypto.createHash('sha256').update(reqStr).digest('hex');
    const resHash = crypto.createHash('sha256').update(resStr).digest('hex');
    const latency = SandboxBankingSimulationService.getLatency(this.provider);

    await supabaseAdmin.from('provider_api_audit_logs').insert({
      provider: this.provider,
      capability: capability,
      financial_event_id: financialEventId || null,
      request_hash: reqHash,
      response_hash: resHash,
      status_code: statusCode,
      latency_ms: latency,
      request_type: requestType
    });
  }

  async provisionVirtualAccount(params: {
    tenantId: string;
    accountType: 'STATIC' | 'DYNAMIC';
    accountName: string;
  }): Promise<{ accountNumber: string; bankName: string; expiresAt?: string }> {
    await CredentialResolverService.resolve(this.provider);

    const forced = SandboxBankingSimulationService.getForcedStatus(this.provider);
    if (forced === 'TIMEOUT') throw new Error('Gateway Timeout');
    if (forced === 'FAILED') throw new Error('Provisioning failed');

    const accountNumber = '30' + Math.floor(10000000 + Math.random() * 90000000).toString();
    const result = {
      accountNumber,
      bankName: 'Wema Bank (via Paystack)',
      expiresAt: params.accountType === 'DYNAMIC' ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : undefined
    };

    await this.audit('VA_CREATION', 'supports_virtual_accounts', params, result, 200);
    return result;
  }

  async nameEnquiry(params: {
    bankCode: string;
    accountNumber: string;
  }): Promise<{ accountName: string; isVerified: boolean }> {
    await CredentialResolverService.resolve(this.provider);

    const forced = SandboxBankingSimulationService.getForcedStatus(this.provider);
    if (forced === 'TIMEOUT') throw new Error('Gateway Timeout');
    if (forced === 'FAILED') throw new Error('Name enquiry failed');

    const result = {
      accountName: 'PAYSTACK MOCK RECIPIENT',
      isVerified: true
    };

    await this.audit('NAME_ENQUIRY', 'supports_name_enquiry', params, result, 200);
    return result;
  }

  async executeTransfer(params: {
    transferLogId: string;
    amount: number;
    fee: number;
    beneficiaryBankCode: string;
    beneficiaryAccountNumber: string;
    financialEventId?: string;
  }): Promise<{ providerReference: string; status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'TIMEOUT' }> {
    await CredentialResolverService.resolve(this.provider);

    const forced = SandboxBankingSimulationService.getForcedStatus(this.provider);
    if (forced === 'TIMEOUT') {
      await this.audit('TRANSFER', 'supports_nip_transfer', params, { error: 'Timeout' }, 504, params.financialEventId);
      return { providerReference: `ref_paystack_err_${Date.now()}`, status: 'TIMEOUT' };
    }
    if (forced === 'FAILED') {
      await this.audit('TRANSFER', 'supports_nip_transfer', params, { error: 'Failed' }, 400, params.financialEventId);
      return { providerReference: `ref_paystack_err_${Date.now()}`, status: 'FAILED' };
    }

    const ref = `ref_paystack_${Date.now()}`;
    const result = {
      providerReference: ref,
      status: forced as any || 'SUCCESS'
    };

    await this.audit('TRANSFER', 'supports_nip_transfer', params, result, 200, params.financialEventId);
    return result;
  }

  async checkTransferStatus(reference: string): Promise<{ status: 'SUCCESS' | 'FAILED' | 'PENDING' }> {
    await CredentialResolverService.resolve(this.provider);
    const result = { status: 'SUCCESS' as const };
    await this.audit('TRANSFER_STATUS', 'supports_nip_transfer', { reference }, result, 200);
    return result;
  }

  async validateWebhook(payload: any, signature: string): Promise<boolean> {
    if (!signature) return false;
    return signature === 'paystack_signature_token';
  }

  async getHealthMetrics(): Promise<{ latencyMs: number; errorRate: number }> {
    const latency = SandboxBankingSimulationService.getLatency(this.provider);
    const failed = SandboxBankingSimulationService.getForcedStatus(this.provider) === 'FAILED';
    return {
      latencyMs: latency,
      errorRate: failed ? 1.00 : 0.00
    };
  }
}
