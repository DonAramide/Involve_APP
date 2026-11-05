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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseGenerator = void 0;
const crypto = __importStar(require("crypto"));
const build_variant_1 = require("../config/build-variant");
function resolveLicenseHmacSecret() {
    const fromEnv = process.env.LICENSE_HMAC_SECRET;
    if (fromEnv && fromEnv.length >= 16) {
        return fromEnv;
    }
    const variant = build_variant_1.BuildVariantService.getInstance();
    if (variant.isStaging() || variant.isProd() || process.env.NODE_ENV === 'production') {
        throw new Error('LICENSE_HMAC_SECRET is required in staging/production');
    }
    // LOCAL-only ephemeral secret — NOT the historically compromised constant
    if (!process.env.__LOCAL_LICENSE_HMAC__) {
        process.env.__LOCAL_LICENSE_HMAC__ = crypto.randomBytes(32).toString('hex');
        console.warn('[LicenseGenerator] LICENSE_HMAC_SECRET unset — using ephemeral LOCAL secret (licenses will not survive process restart)');
    }
    return process.env.__LOCAL_LICENSE_HMAC__;
}
class LicenseGenerator {
    static get hmacSecret() {
        return resolveLicenseHmacSecret();
    }
    static encodeSuffix(suffix) {
        if (!suffix)
            return 0;
        let hash = 5381n;
        for (let i = 0; i < suffix.length; i++) {
            hash = ((hash << 5n) + hash) + BigInt(suffix.charCodeAt(i));
        }
        return Number(hash & 0xffffn);
    }
    static generateBusinessHash(name) {
        const bytes = Buffer.from(name.toLowerCase().trim(), 'utf8');
        const digest = crypto.createHash('sha1').update(bytes).digest();
        return digest.readUInt32BE(0) >>> 0;
    }
    static encodeBase32(buffer) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = 0;
        let value = 0;
        let output = '';
        for (let i = 0; i < buffer.length; i++) {
            value = (value << 8) | buffer[i];
            bits += 8;
            while (bits >= 5) {
                output += alphabet[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }
        if (bits > 0) {
            output += alphabet[(value << (5 - bits)) & 31];
        }
        return output;
    }
    static generate(businessName, durationDays, planIndex, deviceSuffix) {
        const buffer = Buffer.alloc(11);
        const expiryTs = Math.floor((Date.now() + durationDays * 24 * 60 * 60 * 1000) / 1000);
        buffer.writeUInt32BE(expiryTs, 0);
        buffer.writeUInt8(planIndex, 4);
        const bizHash = this.generateBusinessHash(businessName);
        buffer.writeUInt32BE(bizHash, 5);
        const licenseId = this.encodeSuffix(deviceSuffix);
        buffer.writeUInt16BE(licenseId, 9);
        const hmac = crypto.createHmac('sha256', this.hmacSecret);
        hmac.update(buffer);
        const signature = hmac.digest();
        const truncatedSignature = signature.subarray(0, 4);
        const finalBytes = Buffer.concat([buffer, truncatedSignature]);
        const rawKey = this.encodeBase32(finalBytes);
        const blocks = [];
        for (let i = 0; i < rawKey.length; i += 4) {
            blocks.push(rawKey.substring(i, Math.min(i + 4, rawKey.length)));
        }
        return blocks.join('-');
    }
    /** Server-side validation — clients must call an API, not embed the HMAC secret. */
    static validate(key, businessName) {
        try {
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            const normalized = key.replace(/-/g, '').toUpperCase();
            let bits = 0;
            let value = 0;
            const bytes = [];
            for (const ch of normalized) {
                const idx = alphabet.indexOf(ch);
                if (idx < 0)
                    return { valid: false };
                value = (value << 5) | idx;
                bits += 5;
                while (bits >= 8) {
                    bytes.push((value >>> (bits - 8)) & 0xff);
                    bits -= 8;
                }
            }
            if (bytes.length !== 15)
                return { valid: false };
            const payload = Buffer.from(bytes.slice(0, 11));
            const provided = Buffer.from(bytes.slice(11, 15));
            const hmac = crypto.createHmac('sha256', this.hmacSecret);
            hmac.update(payload);
            const calculated = hmac.digest().subarray(0, 4);
            if (!crypto.timingSafeEqual(provided, calculated))
                return { valid: false };
            const bizHash = this.generateBusinessHash(businessName);
            if (payload.readUInt32BE(5) !== bizHash)
                return { valid: false };
            return {
                valid: true,
                expiryTs: payload.readUInt32BE(0),
                planIndex: payload.readUInt8(4),
                licenseId: payload.readUInt16BE(9),
            };
        }
        catch {
            return { valid: false };
        }
    }
}
exports.LicenseGenerator = LicenseGenerator;
//# sourceMappingURL=license.util.js.map