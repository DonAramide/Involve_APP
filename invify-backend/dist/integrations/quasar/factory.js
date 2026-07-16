"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuasarService = void 0;
// src/integrations/quasar/factory.ts
const quasar_service_1 = require("./quasar.service");
/**
 * Factory function to retrieve a correctly initialized QuasarService.
 * RULE: Platform-level credentials only. NEVER use per-tenant API keys.
 * Production model: single platform Quasar account (QUASER_API_KEY env var).
 * tenantId parameter retained for signature compatibility.
 */
const getQuasarService = async (tenantId) => {
    const platformApiKey = process.env.QUASER_API_KEY;
    if (!platformApiKey) {
        console.error(`[Quasar Factory] QUASER_API_KEY environment variable is not set. Cannot initialize QuasarService for tenant: ${tenantId}`);
        throw new Error('QUASER_API_KEY environment variable is required for Quasar integration');
    }
    const webhookSecret = process.env.QUASER_WEBHOOK_SECRET || '';
    return new quasar_service_1.QuasarService(platformApiKey, webhookSecret);
};
exports.getQuasarService = getQuasarService;
//# sourceMappingURL=factory.js.map