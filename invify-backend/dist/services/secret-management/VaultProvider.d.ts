export interface VaultProvider {
    providerId: string;
    retrieveSecret(reference: string): Promise<string>;
}
export declare class SupabaseVaultProvider implements VaultProvider {
    providerId: string;
    private secrets;
    setSecret(reference: string, value: string): void;
    retrieveSecret(reference: string): Promise<string>;
}
export declare class HashiCorpVaultProvider implements VaultProvider {
    providerId: string;
    private secrets;
    simulateFailure: boolean;
    setSecret(reference: string, value: string): void;
    retrieveSecret(reference: string): Promise<string>;
}
export declare class AwsKmsProvider implements VaultProvider {
    providerId: string;
    private secrets;
    simulateFailure: boolean;
    setSecret(reference: string, value: string): void;
    retrieveSecret(reference: string): Promise<string>;
}
export declare class AzureKeyVaultProvider implements VaultProvider {
    providerId: string;
    private secrets;
    simulateFailure: boolean;
    setSecret(reference: string, value: string): void;
    retrieveSecret(reference: string): Promise<string>;
}
