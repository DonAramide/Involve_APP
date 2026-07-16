import { ProviderCertificate } from '../certificate-management/CertificateRegistry';
export interface CertificateHealthEntry {
    provider: ProviderCertificate['provider'];
    certType: ProviderCertificate['cert_type'];
    status: ProviderCertificate['status'];
    validTo: string;
    daysUntilExpiry: number;
    isExpiring: boolean;
    isExpired: boolean;
}
export interface CertificateMonitorSnapshot {
    activeCerts: number;
    expiringCerts: number;
    expiredCerts: number;
    revokedCerts: number;
    certificates: CertificateHealthEntry[];
    capturedAt: string;
}
export declare class CertificateMonitor {
    /**
     * Inspects all registered certificates and returns expiry/health status.
     */
    static getSnapshot(): CertificateMonitorSnapshot;
}
