/**
 * DEFINITIVE NOTIFICATION ENVELOPES & LINEAGE SIGNATURES
 * Provides monotonic sequence counting alongside highly deterministic SHA-256 payload integrity signing.
 */

/**
 * DEFINITIVE NOTIFICATION ENVELOPES & LINEAGE SIGNATURES
 * Provides monotonic sequence counting alongside highly deterministic SHA-256 payload integrity signing.
 */

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 for insecure HTTP (LAN admin). crypto.subtle is HTTPS/localhost only. */
function sha256Js(message) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const rotr = (n, x) => (x >>> n) | (x << (32 - n));
  const utf8 = unescape(encodeURIComponent(message));
  const bytes = [];
  for (let i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i) & 0xff);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push((bitLen >>> (i * 8)) & 0xff);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Array(64);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((n) => n.toString(16).padStart(8, '0'))
    .join('');
}

const computeSHA256Sync = async (plainText) => {
  if (globalThis.crypto?.subtle?.digest) {
    const data = new TextEncoder().encode(plainText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return bytesToHex(new Uint8Array(hashBuffer));
  }
  return sha256Js(plainText);
};

class LineageSequenceController {
  constructor() {
    this.currentSequence = 10000;
  }

  /**
   * Generates a strict monotonic incrementing numeric reference prefix
   */
  getNextMonotonicId() {
    this.currentSequence += 1;
    return `LN-SEQ-${this.currentSequence}-${Date.now().toString().slice(-6)}`;
  }

  /**
   * Generates a complete verification hash binding all payload metadata immutably
   */
  async signEnvelope(envelopeModel) {
    const rawPayload = envelopeModel.toJSON ? envelopeModel.toJSON() : envelopeModel;
    
    // Extract deterministic canonical order dictionary strip
    const canonicalString = JSON.stringify({
      broadcastId: rawPayload.broadcastId,
      tenantId: rawPayload.tenantId,
      severity: rawPayload.severity,
      timestamp: rawPayload.timestamp,
      message: rawPayload.message,
      locationContext: rawPayload.locationContext || null
    });

    const signature = await computeSHA256Sync(canonicalString);
    rawPayload.lineageHash = signature;
    return rawPayload;
  }

  /**
   * Re-evaluates serialized signatures to prove data has not been modified or truncated
   */
  async verifyEnvelopeIntegrity(signedPayload) {
    if (!signedPayload || !signedPayload.lineageHash) {
      return false;
    }

    const expectedString = JSON.stringify({
      broadcastId: signedPayload.broadcastId,
      tenantId: signedPayload.tenantId,
      severity: signedPayload.severity,
      timestamp: signedPayload.timestamp,
      message: signedPayload.message,
      locationContext: signedPayload.locationContext || null
    });

    const calculatedHash = await computeSHA256Sync(expectedString);
    return calculatedHash === signedPayload.lineageHash;
  }
}

export const lineageControllerSingleton = new LineageSequenceController();
