import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_VERSION = process.env.VAULT_KEY_VERSION || 'v1';

// We require a 32-byte (256-bit) base64 or hex string as master key. 
// If not provided, we throw to prevent insecure startups in production,
// but for dev we can fallback.
let masterKeyBuffer: Buffer;

function getMasterKey(): Buffer {
  if (masterKeyBuffer) return masterKeyBuffer;

  const keyHex = process.env.VAULT_MASTER_KEY;
  if (!keyHex) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: VAULT_MASTER_KEY is not set in environment.');
    } else {
      console.warn('WARNING: Using insecure fallback master key for development ONLY.');
      masterKeyBuffer = crypto.scryptSync('insecure-dev-password', 'salt', 32);
      return masterKeyBuffer;
    }
  }

  // Expecting a 32-byte hex string (64 characters)
  if (keyHex.length === 64) {
    masterKeyBuffer = Buffer.from(keyHex, 'hex');
  } else {
    // If it's a random string, hash it to exactly 32 bytes
    masterKeyBuffer = crypto.scryptSync(keyHex, 'vault_salt', 32);
  }
  return masterKeyBuffer;
}

export interface EncryptedPayload {
  encryptedValue: string;
  iv: string;
  authTag: string;
  keyVersion: string;
}

export class VaultEncryptionUtil {
  /**
   * Encrypts a plaintext secret using AES-256-GCM.
   */
  static encrypt(plaintext: string): EncryptedPayload {
    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
      encryptedValue: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag,
      keyVersion: KEY_VERSION
    };
  }

  /**
   * Decrypts an encrypted payload using AES-256-GCM.
   */
  static decrypt(payload: EncryptedPayload): string {
    // Note: In the future, if KEY_VERSION changes, you would fetch the corresponding old key
    // from a secure keystore. For now, we assume the current master key can decrypt it.
    if (payload.keyVersion !== KEY_VERSION) {
      console.warn(`[Vault] Decrypting legacy key version: ${payload.keyVersion} with current master key.`);
    }

    const key = getMasterKey();
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const encryptedText = payload.encryptedValue;

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
