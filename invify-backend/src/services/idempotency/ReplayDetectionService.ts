import * as crypto from 'crypto';

export class ReplayDetectionService {
  /**
   * Computes SHA-256 hash of request body/payload.
   */
  static hashPayload(payload: any): string {
    if (!payload) return '';
    const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHash('sha256').update(bodyStr).digest('hex');
  }

  /**
   * Verifies if a request timestamp is inside the acceptable sliding replay window.
   * If a request is too old, it's rejected.
   * @param createdAtIso timestamp of key creation
   * @param windowSeconds length of sliding replay window (e.g. 300 seconds / 5 mins)
   */
  static isWithinReplayWindow(createdAtIso: string, windowSeconds = 300): boolean {
    const elapsed = Date.now() - new Date(createdAtIso).getTime();
    return elapsed >= 0 && elapsed <= windowSeconds * 1000;
  }
}
