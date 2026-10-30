export interface SentryIncident {
    id: string;
    errorName: string;
    errorMessage: string;
    extraContext: any;
    timestamp: string;
}
export declare class SentryClient {
    private static incidents;
    static clearIncidents(): void;
    static getIncidents(): SentryIncident[];
    /**
     * Capture exceptions and record them in the mock Sentry database.
     */
    static captureException(error: Error, extraContext?: any): string;
}
