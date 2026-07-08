export interface VaultProvider {
  providerId: string;
  retrieveSecret(reference: string): Promise<string>;
}

export class SupabaseVaultProvider implements VaultProvider {
  providerId = 'supabase-vault';
  private secrets: Record<string, string> = {};

  setSecret(reference: string, value: string) {
    this.secrets[reference] = value;
  }

  async retrieveSecret(reference: string): Promise<string> {
    if (this.secrets[reference] !== undefined) {
      return this.secrets[reference];
    }
    throw new Error(`Supabase Vault: Secret reference "${reference}" not found`);
  }
}

export class HashiCorpVaultProvider implements VaultProvider {
  providerId = 'hashicorp-vault';
  private secrets: Record<string, string> = {};
  public simulateFailure = false;

  setSecret(reference: string, value: string) {
    this.secrets[reference] = value;
  }

  async retrieveSecret(reference: string): Promise<string> {
    if (this.simulateFailure) {
      throw new Error('HashiCorp Vault: Connection timed out (Simulated API Exception)');
    }
    if (this.secrets[reference] !== undefined) {
      return this.secrets[reference];
    }
    throw new Error(`HashiCorp Vault: Secret reference "${reference}" not found`);
  }
}

export class AwsKmsProvider implements VaultProvider {
  providerId = 'aws-kms';
  private secrets: Record<string, string> = {};
  public simulateFailure = false;

  setSecret(reference: string, value: string) {
    this.secrets[reference] = value;
  }

  async retrieveSecret(reference: string): Promise<string> {
    if (this.simulateFailure) {
      throw new Error('AWS KMS: Decrypt operation failed (Simulated KMS Exception)');
    }
    if (this.secrets[reference] !== undefined) {
      return this.secrets[reference];
    }
    throw new Error(`AWS KMS: Ciphertext reference "${reference}" decryption failed`);
  }
}

export class AzureKeyVaultProvider implements VaultProvider {
  providerId = 'azure-keyvault';
  private secrets: Record<string, string> = {};
  public simulateFailure = false;

  setSecret(reference: string, value: string) {
    this.secrets[reference] = value;
  }

  async retrieveSecret(reference: string): Promise<string> {
    if (this.simulateFailure) {
      throw new Error('Azure Key Vault: ServiceUnavailable (Simulated API Exception)');
    }
    if (this.secrets[reference] !== undefined) {
      return this.secrets[reference];
    }
    throw new Error(`Azure Key Vault: Secret reference "${reference}" not found`);
  }
}
