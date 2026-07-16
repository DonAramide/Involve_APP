"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultEncryptionUtil = void 0;
const crypto_1 = __importDefault(require("crypto"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_VERSION = process.env.VAULT_KEY_VERSION || 'v1';
// We require a 32-byte (256-bit) base64 or hex string as master key. 
// If not provided, we throw to prevent insecure startups in production,
// but for dev we can fallback.
let masterKeyBuffer;
function getMasterKey() {
    if (masterKeyBuffer)
        return masterKeyBuffer;
    const keyHex = process.env.VAULT_MASTER_KEY;
    if (!keyHex) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: VAULT_MASTER_KEY is not set in environment.');
        }
        else {
            console.warn('WARNING: Using insecure fallback master key for development ONLY.');
            masterKeyBuffer = crypto_1.default.scryptSync('insecure-dev-password', 'salt', 32);
            return masterKeyBuffer;
        }
    }
    // Expecting a 32-byte hex string (64 characters)
    if (keyHex.length === 64) {
        masterKeyBuffer = Buffer.from(keyHex, 'hex');
    }
    else {
        // If it's a random string, hash it to exactly 32 bytes
        masterKeyBuffer = crypto_1.default.scryptSync(keyHex, 'vault_salt', 32);
    }
    return masterKeyBuffer;
}
class VaultEncryptionUtil {
    /**
     * Encrypts a plaintext secret using AES-256-GCM.
     */
    static encrypt(plaintext) {
        const key = getMasterKey();
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
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
    static decrypt(payload) {
        // Note: In the future, if KEY_VERSION changes, you would fetch the corresponding old key
        // from a secure keystore. For now, we assume the current master key can decrypt it.
        if (payload.keyVersion !== KEY_VERSION) {
            console.warn(`[Vault] Decrypting legacy key version: ${payload.keyVersion} with current master key.`);
        }
        const key = getMasterKey();
        const iv = Buffer.from(payload.iv, 'hex');
        const authTag = Buffer.from(payload.authTag, 'hex');
        const encryptedText = payload.encryptedValue;
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.VaultEncryptionUtil = VaultEncryptionUtil;
//# sourceMappingURL=vault-encryption.util.js.map