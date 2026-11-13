export declare class CredentialResolverService {
    static resolve(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA'): Promise<{
        id: string;
        provider: string;
        keyVersion: string;
        publicKey: string;
        vaultKeyReference: string;
        status: 'ACTIVE' | 'ROTATING' | 'RETIRED' | 'COMPROMISED';
    }>;
}
