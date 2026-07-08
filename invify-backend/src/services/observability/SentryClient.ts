import { StructuredLogger } from './StructuredLogger';

export interface SentryIncident {
  id: string;
  errorName: string;
  errorMessage: string;
  extraContext: any;
  timestamp: string;
}

export class SentryClient {
  private static incidents: SentryIncident[] = [];

  static clearIncidents() {
    this.incidents = [];
  }

  static getIncidents(): SentryIncident[] {
    return this.incidents;
  }

  /**
   * Capture exceptions and record them in the mock Sentry database.
   */
  static captureException(error: Error, extraContext: any = {}): string {
    const id = 'sentry-inc-' + Math.random().toString(36).substring(2, 10);
    const incident: SentryIncident = {
      id,
      errorName: error.name,
      errorMessage: error.message,
      extraContext,
      timestamp: new Date().toISOString(),
    };
    
    this.incidents.push(incident);

    StructuredLogger.error(`[Sentry Alert Generated] Exception captured. Incident ID: ${id}`, error, {
      sentryIncidentId: id,
      ...extraContext,
    });

    return id;
  }
}
