/**
 * QuasarConnectivityHealthService — Operational visibility into the Quasar dependency.
 *
 * Responsibilities:
 *  - Ping Quasar public health endpoint
 *  - Verify platform partner credentials (per vertical) are set
 *  - Verify active tenant API keys are reachable
 *  - Surface a structured health report for the Invify admin dashboard
 *  - Raise console alerts when Quasar becomes unavailable
 *
 * This service is read-only and never mutates state.
 */
import { InvifyVertical } from './quasar-platform.client';
export type HealthStatus = 'healthy' | 'degraded' | 'unreachable' | 'unknown';
export interface VerticalCredentialCheck {
    vertical: InvifyVertical;
    clientIdPresent: boolean;
    clientSecretPresent: boolean;
    status: 'ok' | 'missing';
}
export interface TenantKeyCheck {
    invifyTenantId: string;
    quasarTenantId: string;
    vertical: InvifyVertical;
    environment: string;
    reachable: boolean;
    latencyMs: number | null;
    error?: string;
}
export interface QuasarHealthReport {
    checkedAt: string;
    overallStatus: HealthStatus;
    apiReachable: boolean;
    apiLatencyMs: number | null;
    circuitBreakerOpen: boolean;
    credentialChecks: VerticalCredentialCheck[];
    tenantKeyChecks: TenantKeyCheck[];
    alerts: string[];
}
export declare class QuasarConnectivityHealthService {
    private static readonly BASE_URL;
    /**
     * Full health check — safe to call on a schedule or via admin endpoint.
     * Never throws; returns a structured report even on total failure.
     */
    static check(): Promise<QuasarHealthReport>;
    /**
     * Lightweight liveness check — just pings GET /health.
     * Safe to call from k8s probes or cron.
     */
    static isAlive(): Promise<boolean>;
    private static pingHealth;
    private static checkCredentials;
    private static checkTenantKeys;
}
