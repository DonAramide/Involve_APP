export declare class InsightsService {
    /**
     * Generates actionable insights for a specific class.
     */
    static getClassInsights(tenantId: string, classLevel: string): Promise<{
        stats: any;
        messages: {
            type: string;
            icon: string;
            message: string;
        }[];
    } | null>;
}
