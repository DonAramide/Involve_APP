// backend/src/services/license.service.js
const crypto = require('crypto');

class LicenseService {
    constructor() {
        this.hmacSecret = "INVOLVE-SECURE-HMAC-SECRET-2024";
        this.base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    }

    /**
     * Generates a valid license key for the mobile app
     * [Expiry: 4][Plan: 1][BizHash: 4][LicenseID: 4][HMAC: 4] = 17 bytes
     */
    generateLicense({ businessName, durationDays, planIndex, licenseId }) {
        const buffer = Buffer.alloc(13); // Increased from 11 to 13

        // 1. Expiry (4 bytes - Big Endian)
        const expiryTs = Math.floor(Date.now() / 1000) + (durationDays * 86400);
        buffer.writeUInt32BE(expiryTs, 0);

        // 2. Plan Index (1 byte)
        buffer.writeUInt8(planIndex || 0, 4);

        // 3. Business Hash (4 bytes)
        const bizHash = this._generateBusinessHash(businessName);
        buffer.writeUInt32BE(bizHash, 5);

        // 4. License ID (4 bytes - Upgraded from 2)
        const lId = typeof licenseId === 'string' ? parseInt(licenseId, 16) : (licenseId || 0);
        buffer.writeUInt32BE(lId, 9);

        // 5. Sign (HMAC SHA256 - take first 4 bytes)
        const hmac = crypto.createHmac('sha256', this.hmacSecret);
        hmac.update(buffer);
        const signature = hmac.digest().subarray(0, 4);

        // 6. Concatenate
        const finalBuffer = Buffer.concat([buffer, signature]);

        // 7. Encode Base32
        const base32Code = this._encodeBase32(finalBuffer);

        // 8. Format XXXX-XXXX-...
        return base32Code.match(/.{1,4}/g).join('-');
    }

    /**
     * Decodes a license key back into its components
     */
    decodeLicense(key) {
        try {
            const normalized = key.replace(/[-\s]/g, '').toUpperCase();
            const bytes = this._decodeBase32(normalized);
            
            // Expected length is now 17 bytes (13 payload + 4 HMAC)
            if (bytes.length !== 17) throw new Error("Invalid license length");

            const payload = bytes.subarray(0, 13);
            const providedSignature = bytes.subarray(13, 17);

            // Verify signature
            const hmac = crypto.createHmac('sha256', this.hmacSecret);
            hmac.update(payload);
            const calculatedSignature = hmac.digest().subarray(0, 4);

            if (!providedSignature.equals(calculatedSignature)) {
                throw new Error("Invalid signature (code may be tampered)");
            }

            const expiryTs = payload.readUInt32BE(0);
            const planIndex = payload.readUInt8(4);
            const bizHash = payload.readUInt32BE(5);
            const licenseId = payload.readUInt32BE(9);

            const planNames = ['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'];

            return {
                expiryDate: new Date(expiryTs * 1000).toISOString().split('T')[0],
                planType: planNames[planIndex] || 'UNKNOWN',
                bizHash: bizHash.toString(16).toUpperCase(),
                licenseId: licenseId.toString(16).toUpperCase()
            };
        } catch (err) {
            throw new Error(`Decode failed: ${err.message}`);
        }
    }

    _generateBusinessHash(name) {
        const normalized = name.toLowerCase().trim();
        const hash = crypto.createHash('sha1').update(normalized).digest();
        return hash.readUInt32BE(0);
    }

    _encodeBase32(buffer) {
        let bits = 0;
        let value = 0;
        let output = "";

        for (let i = 0; i < buffer.length; i++) {
            value = (value << 8) | buffer[i];
            bits += 8;

            while (bits >= 5) {
                output += this.base32Alphabet[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }

        if (bits > 0) {
            output += this.base32Alphabet[(value << (5 - bits)) & 31];
        }

        return output;
    }

    _decodeBase32(input) {
        let bits = 0;
        let value = 0;
        const output = [];

        for (let i = 0; i < input.length; i++) {
            const idx = this.base32Alphabet.indexOf(input[i]);
            if (idx === -1) continue;

            value = (value << 5) | idx;
            bits += 5;

            if (bits >= 8) {
                output.push((value >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }

        return Buffer.from(output);
    }
}

module.exports = new LicenseService();
