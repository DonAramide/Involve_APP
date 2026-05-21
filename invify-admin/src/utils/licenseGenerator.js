export const LicenseGenerator = {
  hmacSecret: 'INVOLVE-SECURE-HMAC-SECRET-2024',

  encodeSuffix: function (suffix) {
    if (!suffix) return 0;
    let hash = 5381n;
    for (let i = 0; i < suffix.length; i++) {
      hash = ((hash << 5n) + hash) + BigInt(suffix.charCodeAt(i));
    }
    return Number(hash & 0xFFFFn);
  },

  generateBusinessHash: async function (name) {
    const encoder = new TextEncoder();
    const data = encoder.encode(name.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = new Uint8Array(hashBuffer);
    // Read first 4 bytes as Big-Endian uint32
    return ((hashArray[0] << 24) | (hashArray[1] << 16) | (hashArray[2] << 8) | hashArray[3]) >>> 0;
  },

  encodeBase32: function (buffer) {
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
  },

  generate: async function (businessName, durationDays, planIndex, deviceSuffix) {
    // 1. Pack data into 11 bytes
    const buffer = new Uint8Array(11);
    const view = new DataView(buffer.buffer);
    
    // Expiry: 4 bytes (Unix timestamp in seconds)
    const expiryTs = Math.floor((Date.now() + durationDays * 24 * 60 * 60 * 1000) / 1000);
    view.setUint32(0, expiryTs, false); // Big endian
    
    // Plan Type: 1 byte
    view.setUint8(4, planIndex);
    
    // Business Hash: 4 bytes
    const bizHash = await this.generateBusinessHash(businessName);
    view.setUint32(5, bizHash, false); // Big endian
    
    // License ID (Device suffix hash): 2 bytes
    const licenseId = this.encodeSuffix(deviceSuffix);
    view.setUint16(9, licenseId, false); // Big endian
    
    // 2. Calculate HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.hmacSecret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, buffer);
    const signatureArray = new Uint8Array(signatureBuffer);
    
    // 3. Take first 4 bytes of signature
    const truncatedSignature = signatureArray.slice(0, 4);
    
    // 4. Concatenate payload + signature (11 + 4 = 15 bytes)
    const finalBytes = new Uint8Array(15);
    finalBytes.set(buffer, 0);
    finalBytes.set(truncatedSignature, 11);
    
    // 5. Encode to Base32
    const rawKey = this.encodeBase32(finalBytes);
    
    // 6. Format into groups of 4
    const blocks = [];
    for (let i = 0; i < rawKey.length; i += 4) {
      blocks.push(rawKey.substring(i, Math.min(i + 4, rawKey.length)));
    }
    return blocks.join('-');
  }
};
