import { SecretCache } from './SecretCache';
import { ProviderSecretVersion } from './SecretDatabaseService';
import { VaultProvider } from './VaultProvider';
export declare class SecretResolverService {
    private static cache;
    private static providers;
    static registerProvider(provider: VaultProvider): void;
    static getRegisteredProviders(): VaultProvider[];
    static clearProviders(): void;
    static getCache(): SecretCache;
    static resolve(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', operator?: string): Promise<string>;
    static resolveVersion(version: ProviderSecretVersion, operator?: string): Promise<string>;
}
