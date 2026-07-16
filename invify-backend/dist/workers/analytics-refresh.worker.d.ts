export declare class AnalyticsRefreshWorker {
    private isRunning;
    private intervalId?;
    start(): void;
    stop(): void;
    private processQueue;
    private logRefreshResult;
}
export declare const analyticsRefreshWorker: AnalyticsRefreshWorker;
