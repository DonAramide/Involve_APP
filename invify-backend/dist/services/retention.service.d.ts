export declare class RetentionService {
    /**
     * Main scan to identify inactive teachers and schools.
     * Thresholds: 2d (gentle), 5d (warning), 10d (re-engagement).
     */
    static scanAndNudge(): Promise<void>;
    private static triggerMilestone;
    private static sendEmail;
    /**
     * Generates a "Next Action" suggestion based on curriculum timing.
     */
    static getSmartSuggestion(tenantId: string): Promise<string>;
}
