"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarAdminClient = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../../config/env"); // Assuming there's a central env config
class QuasarAdminClient {
    client;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: env_1.env.QUASAR_ADMIN_API_URL || 'https://admin-api.quasar-finance.internal',
            headers: {
                'Authorization': `Bearer ${env_1.env.QUASAR_ADMIN_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 seconds timeout for provisioning
        });
    }
    async createTenant(payload) {
        try {
            const response = await this.client.post('/v1/admin/tenants', payload);
            return response.data;
        }
        catch (error) {
            // Handle axios errors, throw custom domain error if needed
            console.error('Failed to provision Quasar tenant', error);
            throw new Error('Quasar provisioning failed');
        }
    }
    async rotateCredentials(quasarTenantId) {
        throw new Error('Method not implemented yet');
    }
    async suspendTenant(quasarTenantId) {
        throw new Error('Method not implemented yet');
    }
    async reactivateTenant(quasarTenantId) {
        throw new Error('Method not implemented yet');
    }
    async deleteTenant(quasarTenantId) {
        throw new Error('Method not implemented yet');
    }
    async getHealth() {
        try {
            const response = await this.client.get('/health');
            return response.status === 200;
        }
        catch (error) {
            return false;
        }
    }
}
exports.QuasarAdminClient = QuasarAdminClient;
//# sourceMappingURL=quasar-admin.client.js.map