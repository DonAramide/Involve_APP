export declare class ReplayDetectionService {
    /**
     * Computes SHA-256 hash of request body/payload.
     */
    static hashPayload(payload: any): string;
    /**
     * Verifies if a request timestamp is inside the acceptable sliding replay window.
     * If a request is too old, it's rejected.
     * @param createdAtIso timestamp of key creation
     * @param windowSeconds length of sliding replay window (e.g. 300 seconds / 5 mins)
     */
    static isWithinReplayWindow(createdAtIso: string, windowSeconds?: number): boolean;
}
