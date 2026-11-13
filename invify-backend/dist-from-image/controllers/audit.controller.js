"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const supabase_1 = require("../db/supabase");
const pos_service_1 = require("../services/pos.service");
const finance_tenant_1 = require("../utils/finance-tenant");
const resolve_tenant_scope_1 = require("../utils/resolve-tenant-scope");
const gov_audit_service_1 = require("../services/gov-audit.service");
class AuditController {
    /**
     * GET /api/admin/audit-logs
     * Tenant-scoped system audit (financial + terminal + device + governance).
     */
    static async getSystemAuditLogs(req, res) {
        try {
            const user = req.user || {};
            const role = String(user.role || '').toLowerCase();
            const platform = ['super_admin', 'internal_staff'].includes(role);
            const tenantId = platform
                ? String(req.query.tenantId || req.headers['x-tenant-id'] || user.tenantId || '').trim()
                : (0, resolve_tenant_scope_1.resolveTenantScope)(req);
            const result = await gov_audit_service_1.GovAuditService.getLedger({
                tenantId: tenantId || undefined,
                page: String(req.query.page || '1'),
                limit: String(req.query.limit || '100'),
            });
            const data = (result.data || []).map((entry) => ({
                ...entry,
                action_type: entry.action,
                created_at: entry.timestamp,
                details: entry.metadata || null,
                terminal_id: entry.module === 'TERMINAL' ? entry.target : null,
                status: entry.status,
            }));
            return res.status(200).json({
                success: true,
                data,
                total: result.total,
                stats: result.stats,
            });
        }
        catch (error) {
            console.error('[AuditController] getSystemAuditLogs Error:', error.message);
            return res.status(500).json({ error: error.message || 'Failed to load audit logs' });
        }
    }
    static async getTransactionLedger(req, res) {
        try {
            let tenantId;
            try {
                tenantId = (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
            }
            catch (err) {
                return res.status(err?.status || 403).json({ error: err?.message || 'Forbidden: Cross-tenant access denied' });
            }
            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant ID is required' });
            }
            // 1. Fetch successful Cash and Transfer invoices
            let invoicesData = [];
            if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
                // Mock response for invoices
                invoicesData = [];
            }
            else {
                const { data, error } = await supabase_1.supabase
                    .from('invoices')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .in('payment_method', ['CASH', 'TRANSFER', 'VIRTUAL_ACCOUNT'])
                    .order('created_at', { ascending: false })
                    .limit(100);
                if (!error && data)
                    invoicesData = data;
            }
            // 2. Fetch POS attempts (Cards)
            let posData = [];
            if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
                posData = await pos_service_1.PosService.getTransactionHistory(tenantId);
            }
            else {
                const { data, error } = await supabase_1.supabase
                    .from('pos_transaction_attempts')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                    .limit(100);
                if (!error && data)
                    posData = data;
            }
            // 3. Unify the data
            const unified = [];
            // Map invoices
            for (const inv of invoicesData) {
                unified.push({
                    id: inv.id,
                    type: 'INVOICE',
                    paymentMethod: inv.payment_method,
                    amount: inv.total_amount || 0,
                    status: inv.payment_status === 'Paid' ? 'Approved' : (inv.payment_status || 'Pending'),
                    staffName: inv.staff_name || 'System',
                    date: inv.created_at,
                    items: inv.items || [],
                    customerName: inv.customer_name || 'Walk-in',
                    reference: inv.invoice_number || ''
                });
            }
            // Map POS attempts
            for (const pos of posData) {
                const approved = (pos.status || '').toLowerCase() === 'approved';
                const settled = (pos.settlement_status || '').toLowerCase() === 'settled';
                let displayStatus = pos.status || 'Pending';
                if (approved && settled) {
                    displayStatus = 'Settled';
                }
                else if (approved) {
                    displayStatus = 'Approved (Unsettled)';
                }
                unified.push({
                    id: pos.id,
                    type: 'POS',
                    paymentMethod: 'CARD',
                    amount: pos.amount || 0,
                    status: displayStatus,
                    settlementStatus: pos.settlement_status || 'unsettled',
                    settledAt: pos.settled_at || null,
                    staffName: pos.staff_name || pos.staffName || 'System',
                    date: pos.created_at || pos.date,
                    items: pos.items_jsonb || pos.items || [],
                    customerName: 'Cardholder',
                    reference: pos.rrn || pos.id,
                    rrn: pos.rrn || null,
                    stan: pos.stan || null,
                    terminalId: pos.terminal_id || null,
                });
            }
            // Sort by date descending
            unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return res.status(200).json(unified);
        }
        catch (error) {
            console.error('[AuditController] getTransactionLedger Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.AuditController = AuditController;
//# sourceMappingURL=audit.controller.js.map