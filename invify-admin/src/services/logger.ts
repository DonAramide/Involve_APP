/**
 * Enterprise Logger Configuration
 * Wraps console in development and silences/transmits logs in production.
 */
class EnterpriseLogger {
  private isProd = import.meta.env?.PROD || false;

  debug(message: string, ...args: any[]) {
    if (!this.isProd) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (!this.isProd) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (!this.isProd) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]) {
    // In production, this should dispatch to Sentry/Datadog or backend structured logs
    console.error(`[ERROR] ${message}`, ...args);
  }
}

export const logger = new EnterpriseLogger();
