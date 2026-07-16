export interface ProviderCertificate {
    id: string;
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
    certificate_version: string;
    cert_type: 'CLIENT_CERT' | 'ROOT_CA' | 'INTERMEDIATE';
    serial_number: string;
    subject: string;
    issuer: string;
    pem_content: string;
    private_key_ref: string;
    status: 'ACTIVE' | 'ROTATING' | 'RETIRED' | 'REVOKED' | 'EXPIRED';
    environment: string;
    is_active: boolean;
    valid_from: string;
    valid_to: string;
    created_at: string;
}
export interface CertificateAuditRecord {
    id: string;
    certificate_id: string | null;
    action: 'READ' | 'GENERATE' | 'ROTATE' | 'REVOKE' | 'ERROR';
    operator: string;
    status: 'SUCCESS' | 'FAILED';
    details: string;
    created_at: string;
}
export interface CertificatePinningRule {
    id: string;
    domain: string;
    pinned_hashes: string[];
    is_active: boolean;
}
export declare class CertificateRegistry {
    private static mockCerts;
    private static mockAudits;
    private static mockPinningRules;
    private static useMock;
    static clearMockData(): void;
    /** Returns all in-memory certificates (used by ops-center monitors). */
    static getMockCerts(): ProviderCertificate[];
    static getCertificates(provider: string, env: string): Promise<ProviderCertificate[]>;
    static insertCertificate(cert: Partial<ProviderCertificate>): Promise<ProviderCertificate>;
    static updateCertificate(id: string, updates: Partial<ProviderCertificate>): Promise<void>;
    static insertAudit(audit: Partial<CertificateAuditRecord>): Promise<CertificateAuditRecord>;
    static getAudits(): Promise<CertificateAuditRecord[]>;
    static getPinningRule(domain: string): Promise<CertificatePinningRule | null>;
    static insertPinningRule(rule: Partial<CertificatePinningRule>): Promise<CertificatePinningRule>;
}
