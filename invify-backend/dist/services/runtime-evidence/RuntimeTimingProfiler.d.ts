export interface SubsystemTiming {
    name: string;
    durationMs: number;
}
export interface TimingMetrics {
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    minMs: number;
    maxMs: number;
    avgMs: number;
    subsystems: SubsystemTiming[];
}
export declare class RuntimeTimingProfiler {
    private static durations;
    static recordDuration(metricName: string, durationMs: number): void;
    static getMetrics(metricName: string, startedAt: string, finishedAt: string, subsystems: SubsystemTiming[]): TimingMetrics;
    static clearDurations(): void;
}
