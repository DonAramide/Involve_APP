"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyRegistry = void 0;
const supabase_1 = require("../../db/supabase");
class IdempotencyRegistry {
    static mockKeys = [];
    static mockLeases = [];
    static useMock = true; // DB DDL is blocked on staging, always use mock in test/local execution
    static clearMockData() {
        this.mockKeys = [];
        this.mockLeases = [];
    }
    /** Returns all in-memory idempotency key records (used by ops-center monitors). */
    static getMockKeys() {
        return this.mockKeys;
    }
    /** Returns all in-memory execution leases (used by ops-center monitors). */
    static getMockLeases() {
        return this.mockLeases;
    }
    // --- Idempotency Keys ---
    static async getKey(key) {
        if (this.useMock) {
            return this.mockKeys.find(k => k.idempotency_key === key) || null;
        }
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('idempotency_keys')
                .select('*')
                .eq('idempotency_key', key)
                .maybeSingle();
            if (error)
                throw error;
            return data;
        }
        catch {
            return this.mockKeys.find(k => k.idempotency_key === key) || null;
        }
    }
    static async insertKey(record) {
        const item = {
            id: record.id || Math.random().toString(36).substring(2),
            idempotency_key: record.idempotency_key,
            request_path: record.request_path || '',
            request_hash: record.request_hash || '',
            response_status: record.response_status !== undefined ? record.response_status : null,
            response_body: record.response_body !== undefined ? record.response_body : null,
            status: record.status || 'PENDING',
            expires_at: record.expires_at || new Date(Date.now() + 86400000).toISOString(), // default 24h
            created_at: new Date().toISOString(),
        };
        if (this.useMock) {
            this.mockKeys.push(item);
            return item;
        }
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('idempotency_keys')
                .insert(item)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch {
            this.mockKeys.push(item);
            return item;
        }
    }
    static async updateKey(key, updates) {
        if (this.useMock) {
            const idx = this.mockKeys.findIndex(k => k.idempotency_key === key);
            if (idx !== -1) {
                this.mockKeys[idx] = { ...this.mockKeys[idx], ...updates };
            }
            return;
        }
        try {
            const { error } = await supabase_1.supabaseAdmin
                .from('idempotency_keys')
                .update(updates)
                .eq('idempotency_key', key);
            if (error)
                throw error;
        }
        catch {
            const idx = this.mockKeys.findIndex(k => k.idempotency_key === key);
            if (idx !== -1) {
                this.mockKeys[idx] = { ...this.mockKeys[idx], ...updates };
            }
        }
    }
    // --- Leases ---
    static async getLease(resourceId) {
        if (this.useMock) {
            return this.mockLeases.find(l => l.resource_id === resourceId) || null;
        }
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('execution_leases')
                .select('*')
                .eq('resource_id', resourceId)
                .maybeSingle();
            if (error)
                throw error;
            return data;
        }
        catch {
            return this.mockLeases.find(l => l.resource_id === resourceId) || null;
        }
    }
    static async insertOrUpdateLease(lease) {
        const resourceId = lease.resource_id;
        const item = {
            id: lease.id || Math.random().toString(36).substring(2),
            resource_id: resourceId,
            owner_id: lease.owner_id,
            status: lease.status || 'HELD',
            expires_at: lease.expires_at || new Date(Date.now() + 10000).toISOString(), // default 10s lease
            created_at: new Date().toISOString(),
        };
        if (this.useMock) {
            const idx = this.mockLeases.findIndex(l => l.resource_id === resourceId);
            if (idx !== -1) {
                this.mockLeases[idx] = { ...this.mockLeases[idx], ...lease, expires_at: item.expires_at };
                return this.mockLeases[idx];
            }
            else {
                this.mockLeases.push(item);
                return item;
            }
        }
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('execution_leases')
                .upsert(item)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch {
            const idx = this.mockLeases.findIndex(l => l.resource_id === resourceId);
            if (idx !== -1) {
                this.mockLeases[idx] = { ...this.mockLeases[idx], ...lease, expires_at: item.expires_at };
                return this.mockLeases[idx];
            }
            else {
                this.mockLeases.push(item);
                return item;
            }
        }
    }
    static async deleteLease(resourceId) {
        if (this.useMock) {
            this.mockLeases = this.mockLeases.filter(l => l.resource_id !== resourceId);
            return;
        }
        try {
            const { error } = await supabase_1.supabaseAdmin
                .from('execution_leases')
                .delete()
                .eq('resource_id', resourceId);
            if (error)
                throw error;
        }
        catch {
            this.mockLeases = this.mockLeases.filter(l => l.resource_id !== resourceId);
        }
    }
}
exports.IdempotencyRegistry = IdempotencyRegistry;
//# sourceMappingURL=IdempotencyRegistry.js.map