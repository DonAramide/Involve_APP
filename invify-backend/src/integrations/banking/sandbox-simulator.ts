import { BankingProviderAdapter } from './adapter.interface';

export class SandboxProviderAdapter implements BankingProviderAdapter {
  private static forcedStatus: Record<string, string> = {};
  private static latencyOverrides: Record<string, number> = {};

  constructor(public provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA') {}

  static setForcedStatus(provider: string, status: string) {
    this.forcedStatus[provider] = status;
  }

  static setLatencyOverride(provider: string, latencyMs: number) {
    this.latencyOverrides[provider] = latencyMs;
  }

  static clear() {
    this.forcedStatus = {};
    this.latencyOverrides = {};
  }

  async provisionVirtualAccount(params: any): Promise<any> {
    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    return {
      accountNumber: randomSuffix,
      bankName: `${this.provider} Bank Simulator`,
      expiresAt: params.accountType === 'DYNAMIC' ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : undefined
    };
  }

  async nameEnquiry(params: any): Promise<any> {
    return {
      accountName: 'SIMULATED ACCOUNT NAME',
      isVerified: true
    };
  }

  async executeTransfer(params: any): Promise<any> {
    const forced = SandboxProviderAdapter.forcedStatus[this.provider] || 'SUCCESS';
    
    if (forced === 'TIMEOUT') {
      throw new Error('Simulated gateway connect timeout');
    }
    if (forced === 'FAILED') {
      return { providerReference: `ref_${this.provider}_${Date.now()}`, status: 'FAILED' };
    }
    
    return {
      providerReference: `ref_${this.provider}_${Date.now()}`,
      status: forced as any
    };
  }

  async checkTransferStatus(reference: string): Promise<any> {
    return { status: 'SUCCESS' };
  }

  async validateWebhook(payload: any, signature: string): Promise<boolean> {
    return signature === 'hmac_sha512_hash_value';
  }

  async getHealthMetrics(): Promise<any> {
    const latency = SandboxProviderAdapter.latencyOverrides[this.provider] ?? 200;
    const errorRate = SandboxProviderAdapter.forcedStatus[this.provider] === 'FAILED' ? 1.00 : 0.00;
    return { latencyMs: latency, errorRate };
  }
}
