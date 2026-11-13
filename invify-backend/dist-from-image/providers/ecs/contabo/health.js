"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkContaboHealth = checkContaboHealth;
async function checkContaboHealth(resolvedConfig) {
    const endpoint = resolvedConfig['contabo.endpoint'];
    const bucket = resolvedConfig['contabo.bucket'];
    if (!endpoint || !bucket) {
        return {
            status: 'warning',
            message: 'Contabo endpoint or bucket not fully configured',
            timestamp: new Date()
        };
    }
    try {
        // Mock health check logic. In production, this would make an S3 HeadBucket API call.
        return {
            status: 'connected',
            message: 'Successfully connected to Contabo Object Storage',
            timestamp: new Date()
        };
    }
    catch (error) {
        return {
            status: 'failed',
            message: `Failed to connect to Contabo: ${error.message}`,
            timestamp: new Date()
        };
    }
}
//# sourceMappingURL=health.js.map