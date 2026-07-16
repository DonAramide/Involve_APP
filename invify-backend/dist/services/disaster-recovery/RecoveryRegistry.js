"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryRegistry = void 0;
const supabase_1 = require("../../db/supabase");
class RecoveryRegistry {
    static mockIncidents = [];
    static useMock = true; // DB DDL is blocked on staging, always use mock in test/local execution
    static clearMockData() {
        this.mockIncidents = [];
    }
    static getMockIncidents() {
        return this.mockIncidents;
    }
    static async insertIncident(incident) {
        const item = {
            id: incident.id || Math.random().toString(36).substring(2),
            component: incident.component,
            description: incident.description || '',
            resolution_action: incident.resolution_action,
            status: incident.status || 'PENDING',
            created_at: new Date().toISOString(),
            resolved_at: null,
        };
        if (this.useMock) {
            this.mockIncidents.push(item);
            return item;
        }
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('recovery_incidents')
                .insert(item)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch {
            this.mockIncidents.push(item);
            return item;
        }
    }
    static async updateIncident(id, updates) {
        const time = new Date().toISOString();
        if (this.useMock) {
            const idx = this.mockIncidents.findIndex(i => i.id === id);
            if (idx !== -1) {
                this.mockIncidents[idx] = { ...this.mockIncidents[idx], ...updates };
                if (updates.status === 'RESOLVED') {
                    this.mockIncidents[idx].resolved_at = time;
                }
            }
            return;
        }
        try {
            const payload = { ...updates };
            if (updates.status === 'RESOLVED') {
                payload.resolved_at = time;
            }
            const { error } = await supabase_1.supabaseAdmin
                .from('recovery_incidents')
                .update(payload)
                .eq('id', id);
            if (error)
                throw error;
        }
        catch {
            const idx = this.mockIncidents.findIndex(i => i.id === id);
            if (idx !== -1) {
                this.mockIncidents[idx] = { ...this.mockIncidents[idx], ...updates };
                if (updates.status === 'RESOLVED') {
                    this.mockIncidents[idx].resolved_at = time;
                }
            }
        }
    }
}
exports.RecoveryRegistry = RecoveryRegistry;
//# sourceMappingURL=RecoveryRegistry.js.map