import { EventEmitter } from 'events';
export interface SanitizedLogEntry {
    id: string;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
    source: 'backend';
    message: string;
}
export interface HttpErrorRecord {
    timestamp: string;
    method: string;
    path: string;
    statusCode: number;
    latencyMs: number;
    message?: string;
}
export interface ObservabilitySnapshot {
    timestamp: string;
    environment: string;
    release: {
        appEnv: string;
        buildVariant: string;
        appVersion: string;
        gitCommit: string;
        releaseId: string;
        bootTimestamp: string;
        uptimeSeconds: number;
    };
    runtime: {
        pid: number;
        nodeVersion: string;
        cpu: {
            cores: number;
            model: string;
            loadAvg1m: number;
            loadAvg5m: number;
            loadAvg15m: number;
            processCpuPercent: number;
        };
        memory: {
            hostTotalBytes: number;
            hostFreeBytes: number;
            hostUsedBytes: number;
            processRssBytes: number;
            heapUsedBytes: number;
            heapTotalBytes: number;
        };
        disk: {
            totalBytes: number;
            freeBytes: number;
            usedBytes: number;
            usedPercentage: number;
            status: 'available' | 'unavailable';
        };
    };
    health: {
        status: 'healthy' | 'degraded';
        liveness: 'alive';
        readiness: 'ready';
        checksExemptFromMetrics: boolean;
    };
    traffic: {
        windowMinutes: number;
        totalRequests: number;
        requestsPerSecond: number;
        latency: {
            p50Ms: number;
            p95Ms: number;
            p99Ms: number;
        };
        statusDistribution: {
            '2xx': number;
            '3xx': number;
            '4xx': number;
            '5xx': number;
        };
        recentHttpErrors: HttpErrorRecord[];
    };
    authActivity: {
        loginsSuccess: number;
        loginsFailed: number;
        mfaChallengesIssued: number;
        mfaChallengesPassed: number;
        mfaChallengesFailed: number;
        tokenRefreshes: number;
        logouts: number;
    };
    hostDiagnostics: {
        systemdService: string;
        systemctlState: 'managed_by_cli_monitor';
        nginxService: 'managed_by_cli_monitor';
        cliDiagnosticTool: 'scripts/staging-realtime-monitor.sh';
    };
}
export declare class ObservabilityCollectorService extends EventEmitter {
    private static instance;
    private readonly bootTimestamp;
    private readonly logBuffer;
    private readonly latencyBuffer;
    private readonly httpErrorsBuffer;
    private readonly requestTimestampsBuffer;
    private totalRequests;
    private status2xx;
    private status3xx;
    private status4xx;
    private status5xx;
    private loginsSuccess;
    private loginsFailed;
    private mfaChallengesIssued;
    private mfaChallengesPassed;
    private mfaChallengesFailed;
    private tokenRefreshes;
    private logouts;
    private lastCpuUsage;
    private lastCpuTime;
    private calculatedCpuPercent;
    private constructor();
    static getInstance(): ObservabilityCollectorService;
    private startPeriodicVitals;
    private updateCpuCalculation;
    /**
     * Logging Interception Architecture:
     * logger -> SecretSanitizer -> Sanitized Ring Buffer -> Observability API
     *
     * Raw strings are NEVER stored in memory. All inputs are sanitized BEFORE
     * entering the ring buffer.
     */
    private interceptConsoleLogs;
    private sanitizeAndRecordLog;
    /**
     * Records HTTP request telemetry.
     * Explicitly excludes internal monitoring probes and observability calls
     * so they do NOT pollute traffic metrics.
     */
    recordHttpRequest(method: string, path: string, statusCode: number, latencyMs: number, isProbe?: boolean): void;
    /**
     * Records authentication activity without capturing credentials or tokens.
     */
    recordAuthEvent(event: 'login_success' | 'login_failure' | 'mfa_challenge_issued' | 'mfa_pass' | 'mfa_fail' | 'token_refresh' | 'logout'): void;
    private getLatencyPercentile;
    /**
     * Reads filesystem disk stats purely from Node runtime APIs (NO shell execution).
     */
    private getDiskUsage;
    /**
     * Generates the strict allowlisted Snapshot response.
     * Explicitly avoids exposing process.env, request headers, bodies, or shell execution.
     */
    getSnapshot(): ObservabilitySnapshot;
    /**
     * Retrieves sanitized log entries from the in-memory ring buffer.
     */
    getLogs(limit?: number, level?: string, search?: string): SanitizedLogEntry[];
}
