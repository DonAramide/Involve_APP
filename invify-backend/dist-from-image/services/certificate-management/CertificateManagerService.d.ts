import * as tls from 'tls';
import { ProviderCertificate } from './CertificateRegistry';
export declare class CertificateManagerService {
    /**
     * Retrieves active client certificate for a provider.
     */
    static getClientCertificate(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', operator?: string): Promise<ProviderCertificate>;
    /**
     * Generates a Node.js mTLS Secure Context configuration.
     */
    static configureMtls(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', operator?: string): Promise<tls.SecureContextOptions & {
        rejectUnauthorized?: boolean;
    }>;
    /**
     * Computes the SHA-256 pin hash (SPKI fingerprint equivalent) of a PEM public key/cert.
     */
    static computePin(pemContent: string): string;
    /**
     * Verifies the peer public key hash against pinned certificate hashes for the domain.
     */
    static verifyPinning(domain: string, peerCertPem: string, operator?: string): Promise<boolean>;
}
