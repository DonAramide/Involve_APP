export declare class CertificateRotationService {
    /**
     * Execute certificate rotation.
     * Inserts the new certificate as 'ROTATING' and keeps the old active one active (Dual-Active Phase).
     */
    static executeRotation(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', newVersion: string, newPemContent: string, newPrivateKeyRef: string, operator?: string): Promise<{
        oldCertId?: string;
        newCertId: string;
    }>;
    /**
     * Completes the rotation by making the new certificate ACTIVE and retiring the old.
     */
    static completeRotation(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', newCertId: string, oldCertId?: string, operator?: string): Promise<void>;
    /**
     * Emergency revocation of a compromised certificate.
     */
    static revokeCertificate(certId: string, operator?: string): Promise<void>;
}
