export declare class NotificationService {
    static isConfigured(): boolean;
    /**
     * Sends an FCM multicast to registered device tokens.
     * Optional tenantId scopes tokens via users.tenant_id.
     */
    static sendToFleet(options: {
        title: string;
        body: string;
        tenantId?: string | null;
        data?: Record<string, string>;
        priority?: 'high' | 'normal';
    }): Promise<{
        configured: boolean;
        tokenCount: number;
        successCount: number;
        failureCount: number;
        error?: undefined;
    } | {
        configured: boolean;
        tokenCount: number;
        successCount: number;
        failureCount: number;
        error: any;
    }>;
    /**
     * Sends a push notification to a specific user and persists it in DB.
     */
    static sendToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void>;
    /**
     * Finds the school principal(s) and notifies them of a payment.
     */
    static notifySchoolAdminOfPayment(schoolId: string, amount: number, studentName: string): Promise<void>;
    /**
     * Notifies school admin of a successful payout.
     */
    static notifySchoolAdminOfPayoutSuccess(schoolId: string, amount: number): Promise<void>;
    /**
     * Notifies school admin of a failed payout.
     */
    static notifySchoolAdminOfPayoutFailure(schoolId: string, amount: number): Promise<void>;
    private static _getPrincipals;
    private static _cleanupFailedTokens;
}
