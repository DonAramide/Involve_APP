"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceJobStatusBucket = serviceJobStatusBucket;
exports.isMissingRelationError = isMissingRelationError;
function serviceJobStatusBucket(raw) {
    const status = String(raw || '').toLowerCase().trim();
    if (status === 'in_progress' || status === 'pending' || status === 'partial' || status === 'unpaid') {
        return 'active';
    }
    if (status === 'ready' || status === 'completed' || status === 'paid' || status === 'done' || status === 'delivered') {
        return 'ready';
    }
    return 'other';
}
function isMissingRelationError(error) {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '');
    return (code === '42P01' ||
        code === 'PGRST205' ||
        code === '42703' ||
        message.includes('does not exist') ||
        message.includes('could not find the table'));
}
//# sourceMappingURL=service-job-status.js.map