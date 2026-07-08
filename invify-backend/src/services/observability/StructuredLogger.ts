export interface LogContext {
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  provider?: string;
  [key: string]: any;
}

export class StructuredLogger {
  private static activeContext: LogContext = {};
  public static logOutput: string[] = []; // Stores output for verification/tests

  static setContext(context: LogContext) {
    this.activeContext = { ...this.activeContext, ...context };
  }

  static getContext(): LogContext {
    return this.activeContext;
  }

  static clearContext() {
    this.activeContext = {};
    this.logOutput = [];
  }

  private static formatLog(level: string, message: string, meta?: any): string {
    const logObj = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...this.activeContext,
        ...meta,
      },
    };
    const logStr = JSON.stringify(logObj);
    this.logOutput.push(logStr);
    return logStr;
  }

  static debug(message: string, meta?: any) {
    console.log(this.formatLog('DEBUG', message, meta));
  }

  static info(message: string, meta?: any) {
    console.info(this.formatLog('INFO', message, meta));
  }

  static warn(message: string, meta?: any) {
    console.warn(this.formatLog('WARN', message, meta));
  }

  static error(message: string, error?: Error, meta?: any) {
    const errorMeta = error
      ? { errorName: error.name, errorMessage: error.message, errorStack: error.stack }
      : {};
    console.error(this.formatLog('ERROR', message, { ...errorMeta, ...meta }));
  }
}
