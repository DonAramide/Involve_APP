"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityRegistry = void 0;
const supabase_1 = require("../../db/supabase");
class ObservabilityRegistry {
    static mockAlerts = [];
    static useMock = true; // DB DDL is blocked on staging, always use mock in test/local execution
    static clearMockData() {
        this.mockAlerts = [];
    }
    static getMockAlerts() {
        return this.mockAlerts;
    }
    static async insertAlert(alert) {
        const item = {
            id: alert.id || Math.random().toString(36).substring(2),
            rule_name: alert.rule_name,
            severity: alert.severity || 'WARNING',
            status: alert.status || 'ACTIVE',
            details: alert.details || '',
            triggered_at: alert.triggered_at || new Date().toISOString(),
            resolved_at: alert.resolved_at || null,
        };
        if (this.useMock) {
            this.mockAlerts.push(item);
            return item;
        }
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('observability_alerts')
                .insert(item)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch {
            this.mockAlerts.push(item);
            return item;
        }
    }
    static async resolveAlert(id) {
        const time = new Date().toISOString();
        if (this.useMock) {
            const idx = this.mockAlerts.findIndex(a => a.id === id);
            if (idx !== -1) {
                this.mockAlerts[idx].status = 'RESOLVED';
                this.mockAlerts[idx].resolved_at = time;
            }
            return;
        }
        try {
            const { error } = await supabase_1.supabaseAdmin
                .from('observability_alerts')
                .update({ status: 'RESOLVED', resolved_at: time })
                .eq('id', id);
            if (error)
                throw error;
        }
        catch {
            const idx = this.mockAlerts.findIndex(a => a.id === id);
            if (idx !== -1) {
                this.mockAlerts[idx].status = 'RESOLVED';
                this.mockAlerts[idx].resolved_at = time;
            }
        }
    }
}
exports.ObservabilityRegistry = ObservabilityRegistry;
//# sourceMappingURL=ObservabilityRegistry.js.map