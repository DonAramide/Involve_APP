/**
 * DEFINITIVE NOTIFICATION ENVELOPES & LINEAGE SIGNATURES
 * Provides monotonic sequence counting alongside highly deterministic SHA-256 payload integrity signing.
 */

// Simple lightweight runtime implementation providing string hashing to run natively in browser shells
const computeSHA256Sync = async (plainText) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
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
