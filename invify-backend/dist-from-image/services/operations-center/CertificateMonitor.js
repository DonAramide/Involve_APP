"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateMonitor = void 0;
const CertificateRegistry_1 = require("../certificate-management/CertificateRegistry");
/** Alert threshold: flag certificates expiring within this many days. */
const EXPIRY_WARNING_DAYS = 30;
class CertificateMonitor {
    /**
     * Inspects all registered certificates and returns expiry/health status.
     */
    static getSnapshot() {
        const certs = CertificateRegistry_1.CertificateRegistry.getMockCerts();
        const now = Date.now();
        const entries = certs.map((cert) => {
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
exports.CertificateMonitor = CertificateMonitor;
//# sourceMappingURL=CertificateMonitor.js.map