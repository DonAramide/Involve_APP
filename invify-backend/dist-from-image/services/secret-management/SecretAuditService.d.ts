export declare class SecretAuditService {
    static log(action: 'READ' | 'ROTATE' | 'REVOKE' | 'ERROR', provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA' | null, keyVersion: string | null, status: 'SUCCESS' | 'FAILED', details: string, operator?: string): Promise<void>;
}
