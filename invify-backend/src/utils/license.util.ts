import * as crypto from 'crypto';

export class LicenseGenerator {
  private static readonly hmacSecret = 'INVOLVE-SECURE-HMAC-SECRET-2024';

  static encodeSuffix(suffix: string): number {
    if (!suffix) return 0;
    let hash = 5381n;
    for (let i = 0; i < suffix.length; i++) {
      hash = ((hash << 5n) + hash) + BigInt(suffix.charCodeAt(i));
    }
    return Number(hash & 0xFFFFn);
  }

  static generateBusinessHash(name: string): number {
    const bytes = Buffer.from(name.toLowerCase().trim(), 'utf8');
    const digest = crypto.createHash('sha1').update(bytes).digest();
    return digest.readUInt32BE(0) >>> 0;
  }

  static encodeBase32(buffer: Buffer): string {
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

  static generate(businessName: string, durationDays: number, planIndex: number, deviceSuffix: string): string {
    // 1. Pack data into 11 bytes
    const buffer = Buffer.alloc(11);
    
    // Expiry: 4 bytes (Unix timestamp in seconds)
    const expiryTs = Math.floor((Date.now() + durationDays * 24 * 60 * 60 * 1000) / 1000);
    buffer.writeUInt32BE(expiryTs, 0);
    
    // Plan Type: 1 byte
    buffer.writeUInt8(planIndex, 4);
    
    // Business Hash: 4 bytes
    const bizHash = this.generateBusinessHash(businessName);
    buffer.writeUInt32BE(bizHash, 5);
    
    // License ID (Device suffix hash): 2 bytes
    const licenseId = this.encodeSuffix(deviceSuffix);
    buffer.writeUInt16BE(licenseId, 9);
    
    // 2. Calculate HMAC-SHA256
    const hmac = crypto.createHmac('sha256', this.hmacSecret);
    hmac.update(buffer);
    const signature = hmac.digest();
    
    // 3. Take first 4 bytes of signature
    const truncatedSignature = signature.subarray(0, 4);
    
    // 4. Concatenate payload + signature (11 + 4 = 15 bytes)
    const finalBytes = Buffer.concat([buffer, truncatedSignature]);
    
    // 5. Encode to Base32
    const rawKey = this.encodeBase32(finalBytes);
    
    // 6. Format into groups of 4
    const blocks = [];
    for (let i = 0; i < rawKey.length; i += 4) {
      blocks.push(rawKey.substring(i, Math.min(i + 4, rawKey.length)));
    }
    return blocks.join('-');
  }
}
