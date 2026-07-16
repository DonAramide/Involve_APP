"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureKeyVaultProvider = exports.AwsKmsProvider = exports.HashiCorpVaultProvider = exports.SupabaseVaultProvider = void 0;
class SupabaseVaultProvider {
    providerId = 'supabase-vault';
    secrets = {};
    setSecret(reference, value) {
        this.secrets[reference] = value;
    }
    async retrieveSecret(reference) {
        if (this.secrets[reference] !== undefined) {
            return this.secrets[reference];
        }
        throw new Error(`Supabase Vault: Secret reference "${reference}" not found`);
    }
}
exports.SupabaseVaultProvider = SupabaseVaultProvider;
class HashiCorpVaultProvider {
    providerId = 'hashicorp-vault';
    secrets = {};
    simulateFailure = false;
    setSecret(reference, value) {
        this.secrets[reference] = value;
    }
    async retrieveSecret(reference) {
        if (this.simulateFailure) {
            throw new Error('HashiCorp Vault: Connection timed out (Simulated API Exception)');
        }
        if (this.secrets[reference] !== undefined) {
            return this.secrets[reference];
        }
        throw new Error(`HashiCorp Vault: Secret reference "${reference}" not found`);
    }
}
exports.HashiCorpVaultProvider = HashiCorpVaultProvider;
class AwsKmsProvider {
    providerId = 'aws-kms';
    secrets = {};
    simulateFailure = false;
    setSecret(reference, value) {
        this.secrets[reference] = value;
    }
    async retrieveSecret(reference) {
        if (this.simulateFailure) {
            throw new Error('AWS KMS: Decrypt operation failed (Simulated KMS Exception)');
        }
        if (this.secrets[reference] !== undefined) {
            return this.secrets[reference];
        }
        throw new Error(`AWS KMS: Ciphertext reference "${reference}" decryption failed`);
    }
}
exports.AwsKmsProvider = AwsKmsProvider;
class AzureKeyVaultProvider {
    providerId = 'azure-keyvault';
    secrets = {};
    simulateFailure = false;
    setSecret(reference, value) {
        this.secrets[reference] = value;
    }
    async retrieveSecret(reference) {
        if (this.simulateFailure) {
            throw new Error('Azure Key Vault: ServiceUnavailable (Simulated API Exception)');
        }
        if (this.secrets[reference] !== undefined) {
            return this.secrets[reference];
        }
        throw new Error(`Azure Key Vault: Secret reference "${reference}" not found`);
    }
}
exports.AzureKeyVaultProvider = AzureKeyVaultProvider;
//# sourceMappingURL=VaultProvider.js.map