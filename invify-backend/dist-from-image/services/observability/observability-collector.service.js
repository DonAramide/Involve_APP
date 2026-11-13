"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityCollectorService = void 0;
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const events_1 = require("events");
const ring_buffer_1 = require("./ring-buffer");
const secret_sanitizer_1 = require("./secret-sanitizer");
const build_variant_1 = require("../../config/build-variant");
class ObservabilityCollectorService extends events_1.EventEmitter {
    static instance;
    bootTimestamp = new Date();
    // Strictly bounded in-memory structures (total memory < 5 MB)
    logBuffer = new ring_buffer_1.RingBuffer(500);
    latencyBuffer = new ring_buffer_1.RingBuffer(1000);
    httpErrorsBuffer = new ring_buffer_1.RingBuffer(50);
    requestTimestampsBuffer = new ring_buffer_1.RingBuffer(1000);
    // Request traffic counters
    totalRequests = 0;
    status2xx = 0;
    status3xx = 0;
    status4xx = 0;
    status5xx = 0;
    // Authentication activity counters (no credentials stored)
    loginsSuccess = 0;
    loginsFailed = 0;
    mfaChallengesIssued = 0;
    mfaChallengesPassed = 0;
    mfaChallengesFailed = 0;
    tokenRefreshes = 0;
    logouts = 0;
    // CPU calculation tracking
    lastCpuUsage = process.cpuUsage();
    lastCpuTime = Date.now();
    calculatedCpuPercent = 0;
    constructor() {
        super();
        this.startPeriodicVitals();
        this.interceptConsoleLogs();
    }
    static getInstance() {
        if (!ObservabilityCollectorService.instance) {
            ObservabilityCollectorService.instance = new ObservabilityCollectorService();
        }
        return ObservabilityCollectorService.instance;
    }
    startPeriodicVitals() {
        const timer = setInterval(() => {
            this.updateCpuCalculation();
        }, 2000);
        // Unref timer so it does not block Node process exit or Jest tests
        if (typeof timer.unref === 'function') {
            timer.unref();
        }
    }
    updateCpuCalculation() {
        const now = Date.now();
        const elapsedMs = now - this.lastCpuTime;
        if (elapsedMs <= 0)
            return;
        const currentUsage = process.cpuUsage(this.lastCpuUsage);
        this.lastCpuUsage = process.cpuUsage();
        this.lastCpuTime = now;
        const totalMicros = currentUsage.user + currentUsage.system;
        const elapsedMicros = elapsedMs * 1000 * Math.max(1, os_1.default.cpus().length);
        this.calculatedCpuPercent = Math.min(100, Math.round((totalMicros / elapsedMicros) * 1000) / 10);
    }
    /**
     * Logging Interception Architecture:
     * logger -> SecretSanitizer -> Sanitized Ring Buffer -> Observability API
     *
     * Raw strings are NEVER stored in memory. All inputs are sanitized BEFORE
     * entering the ring buffer.
     */
    interceptConsoleLogs() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        console.log = (...args) => {
            originalLog.apply(console, args);
            this.sanitizeAndRecordLog('INFO', args);
        };
        console.warn = (...args) => {
            originalWarn.apply(console, args);
            this.sanitizeAndRecordLog('WARN', args);
        };
        console.error = (...args) => {
            originalError.apply(console, args);
            this.sanitizeAndRecordLog('ERROR', args);
        };
    }
    sanitizeAndRecordLog(level, args) {
        try {
            const rawText = args
                .map((a) => (typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)))
                .join(' ');
            // Ignore internal monitoring noise
            if (rawText.includes('[ObservabilityTick]'))
                return;
            // SANITIZE FIRST before ring buffer insertion
            const sanitized = secret_sanitizer_1.SecretSanitizer.sanitizeString(rawText);
            const entry = {
                id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                timestamp: new Date().toISOString(),
                level,
                source: 'backend',
                message: sanitized,
            };
            this.logBuffer.push(entry);
            this.emit('log', entry);
        }
        catch {
            // Non-blocking log processing
        }
    }
    /**
     * Records HTTP request telemetry.
     * Explicitly excludes internal monitoring probes and observability calls
     * so they do NOT pollute traffic metrics.
     */
    recordHttpRequest(method, path, statusCode, latencyMs, isProbe = false) {
        // Exclude observability endpoints and health check probes from traffic metrics
        if (isProbe || path.startsWith('/api/admin/observability') || path.startsWith('/admin/observability')) {
            return;
        }
        this.totalRequests++;
        const now = Date.now();
        this.requestTimestampsBuffer.push(now);
        this.latencyBuffer.push(latencyMs);
        if (statusCode >= 200 && statusCode < 300) {
            this.status2xx++;
        }
        else if (statusCode >= 300 && statusCode < 400) {
            this.status3xx++;
        }
        else if (statusCode >= 400 && statusCode < 500) {
            this.status4xx++;
            this.httpErrorsBuffer.push({
                timestamp: new Date(now).toISOString(),
                method,
                path: secret_sanitizer_1.SecretSanitizer.sanitizeString(path),
                statusCode,
                latencyMs,
            });
        }
        else if (statusCode >= 500) {
            this.status5xx++;
            this.httpErrorsBuffer.push({
                timestamp: new Date(now).toISOString(),
                method,
                path: secret_sanitizer_1.SecretSanitizer.sanitizeString(path),
                statusCode,
                latencyMs,
            });
        }
    }
    /**
     * Records authentication activity without capturing credentials or tokens.
     */
    recordAuthEvent(event) {
        switch (event) {
            case 'login_success':
                this.loginsSuccess++;
                break;
            case 'login_failure':
                this.loginsFailed++;
                break;
            case 'mfa_challenge_issued':
                this.mfaChallengesIssued++;
                break;
            case 'mfa_pass':
                this.mfaChallengesPassed++;
                break;
            case 'mfa_fail':
                this.mfaChallengesFailed++;
                break;
            case 'token_refresh':
                this.tokenRefreshes++;
                break;
            case 'logout':
                this.logouts++;
                break;
        }
    }
    getLatencyPercentile(percentile) {
        const latencies = this.latencyBuffer.toArray().sort((a, b) => a - b);
        if (latencies.length === 0)
            return 0;
        const index = Math.ceil((percentile / 100) * latencies.length) - 1;
        return latencies[Math.max(0, Math.min(index, latencies.length - 1))];
    }
    /**
     * Reads filesystem disk stats purely from Node runtime APIs (NO shell execution).
     */
    getDiskUsage() {
        try {
            if (typeof fs_1.default.statfsSync === 'function') {
                const stats = fs_1.default.statfsSync(process.platform === 'win32' ? process.cwd() : '/');
                const totalBytes = stats.bsize * stats.blocks;
                const freeBytes = stats.bsize * stats.bfree;
                const usedBytes = totalBytes - freeBytes;
                const usedPercentage = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;
                return { totalBytes, freeBytes, usedBytes, usedPercentage, status: 'available' };
            }
        }
        catch {
            // Fallback if fs.statfsSync is unsupported
        }
        return {
            totalBytes: 0,
            freeBytes: 0,
            usedBytes: 0,
            usedPercentage: 0,
            status: 'unavailable',
        };
    }
    /**
     * Generates the strict allowlisted Snapshot response.
     * Explicitly avoids exposing process.env, request headers, bodies, or shell execution.
     */
    getSnapshot() {
        const memUsage = process.memoryUsage();
        const totalMem = os_1.default.totalmem();
        const freeMem = os_1.default.freemem();
        const usedMem = totalMem - freeMem;
        const loadAvg = os_1.default.loadavg();
        const disk = this.getDiskUsage();
        // Requests per second over bounded sliding window (last 15 minutes)
        const cutoff = Date.now() - 15 * 60 * 1000;
        const recentRequests = this.requestTimestampsBuffer.toArray().filter((t) => t > cutoff);
        const windowSeconds = 15 * 60;
        const requestsPerSecond = Math.round((recentRequests.length / windowSeconds) * 100) / 100;
        const variantService = build_variant_1.BuildVariantService.getInstance();
        const buildVariant = variantService.getVariant();
        const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'staging';
        const appVersion = process.env.npm_package_version || '1.0.0';
        // Safe commit identifier without executing shell commands
        const gitCommit = process.env.GIT_COMMIT || process.env.COMMIT_SHA || 'staging-head';
        const releaseId = `${appEnv.toLowerCase()}-v${appVersion}-${gitCommit}`;
        return {
            timestamp: new Date().toISOString(),
            environment: appEnv.toUpperCase(),
            release: {
                appEnv,
                buildVariant,
                appVersion,
                gitCommit,
                releaseId,
                bootTimestamp: this.bootTimestamp.toISOString(),
                uptimeSeconds: Math.floor(process.uptime()),
            },
            runtime: {
                pid: process.pid,
                nodeVersion: process.version,
                cpu: {
                    cores: os_1.default.cpus().length,
                    model: os_1.default.cpus()[0]?.model || 'Generic CPU',
                    loadAvg1m: Math.round(loadAvg[0] * 100) / 100,
                    loadAvg5m: Math.round(loadAvg[1] * 100) / 100,
                    loadAvg15m: Math.round(loadAvg[2] * 100) / 100,
                    processCpuPercent: this.calculatedCpuPercent,
                },
                memory: {
                    hostTotalBytes: totalMem,
                    hostFreeBytes: freeMem,
                    hostUsedBytes: usedMem,
                    processRssBytes: memUsage.rss,
                    heapUsedBytes: memUsage.heapUsed,
                    heapTotalBytes: memUsage.heapTotal,
                },
                disk,
            },
            health: {
                status: 'healthy',
                liveness: 'alive',
                readiness: 'ready',
                checksExemptFromMetrics: true,
            },
            traffic: {
                windowMinutes: 15,
                totalRequests: this.totalRequests,
                requestsPerSecond,
                latency: {
                    p50Ms: this.getLatencyPercentile(50),
                    p95Ms: this.getLatencyPercentile(95),
                    p99Ms: this.getLatencyPercentile(99),
                },
                statusDistribution: {
                    '2xx': this.status2xx,
                    '3xx': this.status3xx,
                    '4xx': this.status4xx,
                    '5xx': this.status5xx,
                },
                recentHttpErrors: this.httpErrorsBuffer.getRecent(20).reverse(),
            },
            authActivity: {
                loginsSuccess: this.loginsSuccess,
                loginsFailed: this.loginsFailed,
                mfaChallengesIssued: this.mfaChallengesIssued,
                mfaChallengesPassed: this.mfaChallengesPassed,
                mfaChallengesFailed: this.mfaChallengesFailed,
                tokenRefreshes: this.tokenRefreshes,
                logouts: this.logouts,
            },
            hostDiagnostics: {
                systemdService: 'invify-staging-backend.service',
                systemctlState: 'managed_by_cli_monitor',
                nginxService: 'managed_by_cli_monitor',
                cliDiagnosticTool: 'scripts/staging-realtime-monitor.sh',
            },
        };
    }
    /**
     * Retrieves sanitized log entries from the in-memory ring buffer.
     */
    getLogs(limit = 50, level = 'all', search) {
        let logs = this.logBuffer.toArray().reverse();
        if (level && level !== 'all') {
            const upperLevel = level.toUpperCase();
            logs = logs.filter((l) => l.level === upperLevel);
        }
        if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            logs = logs.filter((l) => l.message.toLowerCase().includes(q));
        }
        return logs.slice(0, Math.min(200, Math.max(1, limit)));
    }
}
exports.ObservabilityCollectorService = ObservabilityCollectorService;
//# sourceMappingURL=observability-collector.service.js.map