/**
 * Enterprise Logger Configuration
 * Wraps console in development and silences/transmits logs in production.
 */
class EnterpriseLogger {
  private isProd = process.env.NODE_ENV === 'production';

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
    console.error(`[ERROR] ${message}`, ...args);
  }
}

export const logger = new EnterpriseLogger();
