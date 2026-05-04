// backend/src/services/quaser.service.js
const axios = require('axios');
const { supabase } = require('../config/supabase');

const QUASER_BASE_URL = process.env.QUASER_BASE_URL || 'https://api.invify.app';
const INVIFY_MASTER_KEY = process.env.QUASER_MASTER_KEY;

class QuaserService {
    /**
     * Internal helper to make authorized calls to Quaser
     */
    static async #call(method, path, data = {}, quaserTenantId = null) {
        try {
            const response = await axios({
                method,
                url: `${QUASER_BASE_URL}${path}`,
                data,
                headers: {
                    'Authorization': `Bearer ${INVIFY_MASTER_KEY}`,
                    'X-Quaser-Tenant-ID': quaserTenantId,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (err) {
            console.error(`Quaser SDK Error [${path}]:`, err.response?.data || err.message);
            throw new Error(err.response?.data?.message || 'Quaser API unavailable');
        }
    }

    /**
     * Create/Manage API Keys (SUPER_ADMIN Only)
     */
    static async createApiKey(quaserTenantId, label) {
        return this.#call('POST', '/admin/api-keys', { label }, quaserTenantId);
    }

    static async revokeApiKey(quaserTenantId, keyId) {
        return this.#call('POST', `/admin/api-keys/${keyId}/revoke`, {}, quaserTenantId);
    }

    /**
     * Payment & Wallet Operations
     */
    static async createPaymentIntent(quaserTenantId, amount, metadata) {
        return this.#call('POST', '/payments/create-intent', { amount, metadata, currency: 'NGN' }, quaserTenantId);
    }

    static async getWalletBalance(quaserTenantId) {
        // Source of truth is the internal ledger, but we sync with Quaser
        return this.#call('GET', '/wallet', {}, quaserTenantId);
    }

    static async getTransactions(quaserTenantId, limit = 20) {
        return this.#call('GET', `/wallet/transactions?limit=${limit}`, {}, quaserTenantId);
    }

    /**
     * Resolve Quaser Tenant ID from Invify Tenant ID
     */
    static async getQuaserId(tenantId) {
        const { data, error } = await supabase
            .from('invify_tenants')
            .select('quaser_tenant_id')
            .eq('id', tenantId)
            .single();
        
        if (error || !data) throw new Error('Tenant mapping not found');
        return data.quaser_tenant_id;
    }
}

module.exports = QuaserService;
