export interface ProviderCertification {
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
    vaultReady: boolean;
    configured: boolean;
    healthy: boolean;
    certified: boolean;
    allowed: boolean;
    status: 'ACTIVE' | 'INACTIVE';
}
export declare class ProviderCertificationService {
    private static certs;
    static clearState(): void;
    static getCertification(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA'): ProviderCertification;
    static updateCertification(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', updates: Partial<ProviderCertification>): void;
    static verifyAndCanExecute(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA'): boolean;
}
