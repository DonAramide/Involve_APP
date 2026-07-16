export interface EncryptedPayload {
    encryptedValue: string;
    iv: string;
    authTag: string;
    keyVersion: string;
}
export declare class VaultEncryptionUtil {
    /**
     * Encrypts a plaintext secret using AES-256-GCM.
     */
    static encrypt(plaintext: string): EncryptedPayload;
    /**
     * Decrypts an encrypted payload using AES-256-GCM.
     */
    static decrypt(payload: EncryptedPayload): string;
}
