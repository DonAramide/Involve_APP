"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredLogger = void 0;
class StructuredLogger {
    static activeContext = {};
    static logOutput = []; // Stores output for verification/tests
    static setContext(context) {
        this.activeContext = { ...this.activeContext, ...context };
    }
    static getContext() {
        return this.activeContext;
    }
    static clearContext() {
        this.activeContext = {};
        this.logOutput = [];
    }
    static formatLog(level, message, meta) {
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
    static debug(message, meta) {
        console.log(this.formatLog('DEBUG', message, meta));
    }
    static info(message, meta) {
        console.info(this.formatLog('INFO', message, meta));
    }
    static warn(message, meta) {
        console.warn(this.formatLog('WARN', message, meta));
    }
    static error(message, error, meta) {
        const errorMeta = error
            ? { errorName: error.name, errorMessage: error.message, errorStack: error.stack }
            : {};
        console.error(this.formatLog('ERROR', message, { ...errorMeta, ...meta }));
    }
}
exports.StructuredLogger = StructuredLogger;
//# sourceMappingURL=StructuredLogger.js.map