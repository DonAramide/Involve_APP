import { CertificateRegistry, ProviderCertificate } from '../certificate-management/CertificateRegistry';

export interface CertificateHealthEntry {
  provider: ProviderCertificate['provider'];
  certType: ProviderCertificate['cert_type'];
  status: ProviderCertificate['status'];
  validTo: string;
  daysUntilExpiry: number;
  isExpiring: boolean; // within EXPIRY_WARNING_DAYS
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

/** Alert threshold: flag certificates expiring within this many days. */
const EXPIRY_WARNING_DAYS = 30;

export class CertificateMonitor {
  /**
   * Inspects all registered certificates and returns expiry/health status.
   */
  static getSnapshot(): CertificateMonitorSnapshot {
    const certs = CertificateRegistry.getMockCerts();
    const now = Date.now();

    const entries: CertificateHealthEntry[] = certs.map((cert) => {
      const expiryMs = new Date(cert.valid_to).getTime();
      const daysUntilExpiry = Math.floor((expiryMs - now) / (1000 * 60 * 60 * 24));
      const isExpired = daysUntilExpiry < 0;
      const isExpiring = !isExpired && daysUntilExpiry <= EXPIRY_WARNING_DAYS;

      return {
        provider: cert.provider,
        certType: cert.cert_type,
        status: cert.status,
        validTo: cert.valid_to,
        daysUntilExpiry,
        isExpiring,
        isExpired,
      };
    });

    return {
      activeCerts: certs.filter((c) => c.status === 'ACTIVE').length,
      expiringCerts: entries.filter((e) => e.isExpiring).length,
      expiredCerts: entries.filter((e) => e.isExpired || e.status === 'EXPIRED').length,
      revokedCerts: certs.filter((c) => c.status === 'REVOKED').length,
      certificates: entries,
      capturedAt: new Date().toISOString(),
    };
  }
}
