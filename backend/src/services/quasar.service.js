// backend/src/services/quasar.service.js
const { QuasarClient } = require('@iips/quasar-sdk');
const { supabase } = require('../config/supabase');

/**
 * Service for managing banking and wallet operations via the official @iips/quasar-sdk.
 * Uses QuasarClient for tenant-scoped operations (Wallets, Payments, Virtual Accounts).
 */
class QuasarService {
    /**
     * Initializes a QuasarClient for a specific tenant using their API key.
     */
    static async #getClient(quasarTenantId) {
        // Fetch the tenant's API key from the tenants table
        const { data: tenant, error } = await supabase
            .from('tenants')
            .select('quaser_api_key')
            .eq('id', quasarTenantId)
            .single();

        const apiKey = tenant?.quaser_api_key || process.env.QUASAR_MASTER_KEY;
        
        if (!apiKey) throw new Error('Quasar API Key not configured for this tenant');
        
        return new QuasarClient({ 
            apiKey: apiKey,
            baseUrl: process.env.QUASAR_BASE_URL || 'https://api.IIPS.app'
        });
    }

    /**
     * Wallet Operations
     */
    static async listWallets(quasarTenantId) {
        const client = await this.#getClient(quasarTenantId);
        return client.wallets.listWallets();
    }

    static async getWallet(quasarTenantId, walletId) {
        const client = await this.#getClient(quasarTenantId);
        return client.wallets.getWallet(walletId);
    }

    static async getTransactions(quasarTenantId, walletId, params = { limit: 20 }) {
        const client = await this.#getClient(quasarTenantId);
        return client.wallets.getTransactions(walletId, params);
    }

    /**
     * Virtual Account & School Operations
     */
    static async getVirtualAccount(quasarTenantId, studentId, currency = 'NGN') {
        const client = await this.#getClient(quasarTenantId);
        return client.school.getVirtualAccount(studentId, { currency });
    }

    static async listStudentPayments(quasarTenantId, studentId, params = { page: 1, pageSize: 20 }) {
        const client = await this.#getClient(quasarTenantId);
        return client.school.listStudentPayments(studentId, params);
    }

    /**
     * Resolve Quasar Tenant ID mapping
     */
    static async getQuasarId(tenantId) {
        const { data, error } = await supabase
            .from('tenants')
            .select('quaser_tenant_id')
            .eq('id', tenantId)
            .single();
        
        if (error || !data) throw new Error('Quasar mapping not found for this tenant');
        return data.quaser_tenant_id;
    }
}

module.exports = QuasarService;
