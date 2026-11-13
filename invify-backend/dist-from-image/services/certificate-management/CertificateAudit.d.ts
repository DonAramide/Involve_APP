export declare class CertificateAudit {
    static log(action: 'READ' | 'GENERATE' | 'ROTATE' | 'REVOKE' | 'ERROR', certificateId: string | null, status: 'SUCCESS' | 'FAILED', details: string, operator?: string): Promise<void>;
}
