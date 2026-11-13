export declare class AuthSessionError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, status: number, message: string);
}
export interface RefreshedSession {
    token: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        role: string;
        tenantId: string | null;
    };
}
export declare function assertRefreshTokenUsable(refreshToken: unknown): string;
/** Decode-only subject peek for binding an expired access token to a verified refresh. Not used as authentication. */
export declare function peekTokenSubject(accessToken: unknown): string | null;
/**
 * Exchange a Supabase refresh token via an ephemeral client (does not mutate the process-wide supabase singleton).
 * Identity is taken from the verified new access token + users table — never from request tenant/role fields.
 */
export declare function exchangeRefreshToken(refreshToken: unknown, boundUserId?: string | null): Promise<RefreshedSession>;
/**
 * Best-effort provider revocation. Possession of a refresh token (or a still-valid access token)
 * is required before targeting another user's sessions.
 */
export declare function revokeProviderSession(opts: {
    refreshToken?: unknown;
    accessToken?: unknown;
}): Promise<{
    revoked: boolean;
}>;
