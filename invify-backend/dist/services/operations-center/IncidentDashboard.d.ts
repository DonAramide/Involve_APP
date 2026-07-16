export type IncidentSource = 'RECOVERY' | 'OBSERVABILITY';
export interface UnifiedIncident {
    id: string;
    source: IncidentSource;
    component: string;
    description: string;
    status: string;
    severity?: string;
    createdAt: string;
    resolvedAt: string | null;
    /** Time-to-resolve in milliseconds (null if still open) */
    ttrMs: number | null;
}
export interface IncidentDashboardSnapshot {
    totalIncidents: number;
    openIncidents: number;
    resolvedIncidents: number;
    /**
     * Mean Time To Resolve (MTTR) in milliseconds.
     * Computed over resolved incidents that have a resolvedAt timestamp.
     * Returns null if no resolved incidents exist.
     */
    mttrMs: number | null;
    /** Human-readable MTTR string */
    mttrFormatted: string | null;
    /** Incidents sorted newest-first */
    timeline: UnifiedIncident[];
    capturedAt: string;
}
export declare class IncidentDashboard {
    /**
     * Merges RecoveryRegistry incidents and ObservabilityRegistry alerts
     * into a unified timeline with MTTR calculation.
     */
    static getSnapshot(): IncidentDashboardSnapshot;
}
