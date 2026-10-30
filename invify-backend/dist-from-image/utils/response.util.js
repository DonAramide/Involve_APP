"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResponse = createResponse;
exports.createErrorResponse = createErrorResponse;
function createResponse(req, data, meta = {}, links = {}) {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    return {
        success: true,
        data,
        meta: {
            requestId: requestId,
            timestamp: new Date().toISOString(),
            ...meta
        },
        links: {
            self: req.originalUrl,
            ...links
        }
    };
}
function createErrorResponse(req, message, code = 'INTERNAL_ERROR', details) {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    return {
        success: false,
        data: null,
        meta: {
            requestId: requestId,
            timestamp: new Date().toISOString()
        },
        error: {
            code,
            message,
            details
        }
    };
}
//# sourceMappingURL=response.util.js.map