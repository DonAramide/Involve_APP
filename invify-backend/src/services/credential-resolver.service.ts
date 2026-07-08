import { SecretResolverService } from './secret-management/SecretResolverService';

export class CredentialResolverService {
  static async resolve(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA'): Promise<{
    id: string;
    provider: string;
    keyVersion: string;
    publicKey: string;
    vaultKeyReference: string;
    status: 'ACTIVE' | 'ROTATING' | 'RETIRED' | 'COMPROMISED';
  }> {
    // Perform Vault resolution. If the secret is RETIRED or COMPROMISED, SecretResolverService throws.
    const secretValue = await SecretResolverService.resolve(provider);

    // Keep active mock metadata for downstream signature/adapter usages
    return {
      id: `cred-${provider.toLowerCase()}`,
      provider,
      keyVersion: 'v1.0.0',
      publicKey: `pubkey-${provider.toLowerCase()}`,
      vaultKeyReference: `vault:${provider.toLowerCase()}:secret`,
      status: 'ACTIVE'
    };
  }
}

