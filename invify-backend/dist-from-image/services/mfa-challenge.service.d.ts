export type MfaOperation = 'setup' | 'verify';
export interface MfaPendingSession {
    token: string;
    refreshToken: string;
}
export interface MfaUserSnapshot {
    id: string;
    email: string;
    role?: string;
    tenantId?: string | null;
    name?: string;
    mfaSecret?: string | null;
    mfaEnabled?: boolean;
}
export interface ValidatedMfaChallenge {
    jti: string;
    userId: string;
    operation: MfaOperation;
    expiresAt: number;
    snapshot?: MfaUserSnapshot;
}
export declare class MfaChallengeError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, status: number, message: string);
}
export declare function issueMfaChallenge(userId: string, operation: MfaOperation, session: MfaPendingSession, snapshot?: MfaUserSnapshot): {
    token: string;
    expiresAt: number;
};
export declare function validateMfaChallenge(token: string, expectedOperation: MfaOperation, requestedUserId?: string): ValidatedMfaChallenge;
export declare function consumeMfaChallenge(challenge: ValidatedMfaChallenge): MfaPendingSession;
export declare function resetMfaChallengesForTests(): void;
