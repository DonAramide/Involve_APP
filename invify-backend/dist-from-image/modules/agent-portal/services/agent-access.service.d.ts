export declare class AgentAccessError extends Error {
    readonly status: number;
    constructor(message: string, status: number);
}
type PasswordSetResult = {
    ok: true;
    email: string;
} | {
    ok: false;
    status: number;
    message: string;
};
export declare class AgentAccessService {
    getPortalUrls(): {
        loginUrl: string;
        setPasswordUrl: string;
    };
    /**
     * Creates the Supabase login for a new agent with an unusable random password.
     * The agent chooses their own password through the emailed set-password link.
     */
    createLogin(email: string, name: string): Promise<string>;
    deleteLogin(authUserId: string): Promise<void>;
    private buildSetPasswordLink;
    sendWelcome(email: string, name: string, agentCode: string): Promise<boolean>;
    sendPasswordReset(email: string, name: string): Promise<boolean>;
    /**
     * Consumes a one-time recovery token and sets the agent's password.
     * The policy is checked before the token is consumed so a rejected password does not burn the link.
     */
    completePasswordSet(tokenHash: string, password: string, claimedEmail?: string): Promise<PasswordSetResult>;
}
export declare const agentAccessService: AgentAccessService;
export {};
