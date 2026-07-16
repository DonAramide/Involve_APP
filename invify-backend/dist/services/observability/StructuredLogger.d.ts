export interface LogContext {
    correlationId?: string;
    userId?: string;
    tenantId?: string;
    provider?: string;
    [key: string]: any;
}
export declare class StructuredLogger {
    private static activeContext;
    static logOutput: string[];
    static setContext(context: LogContext): void;
    static getContext(): LogContext;
    static clearContext(): void;
    private static formatLog;
    static debug(message: string, meta?: any): void;
    static info(message: string, meta?: any): void;
    static warn(message: string, meta?: any): void;
    static error(message: string, error?: Error, meta?: any): void;
}
