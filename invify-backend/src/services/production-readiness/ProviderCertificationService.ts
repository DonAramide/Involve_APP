export interface ProviderCertification {
  provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
  vaultReady: boolean;
  configured: boolean;
  healthy: boolean;
  certified: boolean;
  allowed: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export class ProviderCertificationService {
  private static certs: Record<string, ProviderCertification> = {
    PAYSTACK: { provider: 'PAYSTACK', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
    FLUTTERWAVE: { provider: 'FLUTTERWAVE', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
    PROVIDUS: { provider: 'PROVIDUS', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
    WEMA: { provider: 'WEMA', providerReady: true, vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' } as any
  };

  static clearState() {
    this.certs = {
      PAYSTACK: { provider: 'PAYSTACK', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
      FLUTTERWAVE: { provider: 'FLUTTERWAVE', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
      PROVIDUS: { provider: 'PROVIDUS', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' },
      WEMA: { provider: 'WEMA', vaultReady: true, configured: true, healthy: true, certified: true, allowed: true, status: 'ACTIVE' }
    };
  }

  static getCertification(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA'): ProviderCertification {
    return this.certs[provider];
  }

  static updateCertification(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', updates: Partial<ProviderCertification>) {
    this.certs[provider] = { ...this.certs[provider], ...updates };
  }

  static verifyAndCanExecute(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA'): boolean {
    const cert = this.certs[provider];
    if (!cert) return false;
    return cert.vaultReady && cert.configured && cert.healthy && cert.certified && cert.allowed && cert.status === 'ACTIVE';
  }
}
