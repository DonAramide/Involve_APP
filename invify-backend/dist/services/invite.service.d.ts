export declare class InviteService {
    /**
     * Generates a secure invitation with a hashed token.
     * Senior Policy: Invitations are strictly for 'staff' role only.
     */
    static createInvite(tenantId: string, email: string): Promise<{
        invite: any;
        rawToken: null;
        isNew: boolean;
    } | {
        invite: any;
        rawToken: string;
        isNew: boolean;
    }>;
    /**
     * Validates a raw token against its stored hash.
     */
    static validateToken(rawToken: string): Promise<any>;
    /**
     * Hashes the token using SHA256.
     */
    private static hashToken;
}
/**
 * Mock Service for Email Notifications during local development.
 */
export declare class NotificationService {
    static sendInviteEmail(email: string, schoolName: string, inviteLink: string): Promise<void>;
    static sendQuotaWarning(tenantId: string, usage: number, limit: number): Promise<void>;
}
