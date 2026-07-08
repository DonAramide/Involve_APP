import { RecoveryRegistry, RecoveryIncident } from '../disaster-recovery/RecoveryRegistry';
import { ObservabilityRegistry, AlertIncident } from '../observability/ObservabilityRegistry';

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

export class IncidentDashboard {
  /**
   * Merges RecoveryRegistry incidents and ObservabilityRegistry alerts
   * into a unified timeline with MTTR calculation.
   */
  static getSnapshot(): IncidentDashboardSnapshot {
    const recoveryIncidents = RecoveryRegistry.getMockIncidents();
    const alertIncidents = ObservabilityRegistry.getMockAlerts();

    const unified: UnifiedIncident[] = [];

    // Map recovery incidents
    for (const inc of recoveryIncidents) {
      const ttrMs =
        inc.resolved_at && inc.status === 'RESOLVED'
          ? new Date(inc.resolved_at).getTime() - new Date(inc.created_at).getTime()
          : null;

      unified.push({
        id: inc.id,
        source: 'RECOVERY',
        component: inc.component,
        description: inc.description,
        status: inc.status,
        createdAt: inc.created_at,
        resolvedAt: inc.resolved_at,
        ttrMs,
      });
    }

    // Map observability alerts
    for (const alert of alertIncidents) {
      const ttrMs =
        alert.resolved_at && alert.status === 'RESOLVED'
          ? new Date(alert.resolved_at).getTime() - new Date(alert.triggered_at).getTime()
          : null;

      unified.push({
        id: alert.id,
        source: 'OBSERVABILITY',
        component: alert.rule_name,
        description: alert.details,
        status: alert.status === 'ACTIVE' ? 'PENDING' : 'RESOLVED',
        severity: alert.severity,
        createdAt: alert.triggered_at,
        resolvedAt: alert.resolved_at,
        ttrMs,
      });
    }

    // Sort newest first
    unified.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const openIncidents = unified.filter(
      (i) => i.status !== 'RESOLVED'
    ).length;
    const resolvedIncidents = unified.filter(
      (i) => i.status === 'RESOLVED'
    ).length;

    // MTTR: average TTR for resolved incidents that have a non-null ttrMs
    const resolvedWithTtr = unified.filter(
      (i) => i.status === 'RESOLVED' && i.ttrMs !== null
    );
    let mttrMs: number | null = null;
    let mttrFormatted: string | null = null;

    if (resolvedWithTtr.length > 0) {
      const totalTtr = resolvedWithTtr.reduce((acc, i) => acc + (i.ttrMs as number), 0);
      mttrMs = Math.round(totalTtr / resolvedWithTtr.length);
      const seconds = Math.floor(mttrMs / 1000);
      mttrFormatted = seconds < 60
        ? `${seconds}s`
        : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    }

    return {
      totalIncidents: unified.length,
      openIncidents,
      resolvedIncidents,
      mttrMs,
      mttrFormatted,
      timeline: unified,
      capturedAt: new Date().toISOString(),
    };
  }
}
