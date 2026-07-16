export declare class SecretRotationService {
    /**
     * Schedule a future rotation job.
     */
    static scheduleRotation(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', scheduledAt: Date): Promise<string>;
    /**
     * Execute rotation for a provider.
     * This creates a new secret version with 'ROTATING' state while keeping the old 'ACTIVE' secret active,
     * satisfying the Dual Key Rotation requirement.
     */
    static executeRotation(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', newKeyVersion: string, newVaultKeyReference: string, operator?: string): Promise<{
        oldVersionId?: string;
        newVersionId: string;
    }>;
    /**
     * Complete rotation by promoting the new version to ACTIVE and retiring the old version.
     */
    static completeRotation(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', newVersionId: string, oldVersionId?: string, operator?: string): Promise<void>;
    /**
     * Emergency revocation of a compromised version.
     */
    static revokeVersion(versionId: string, operator?: string): Promise<void>;
}
