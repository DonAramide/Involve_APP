"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const supabase_1 = require("../db/supabase");
const pos_service_1 = require("../services/pos.service");
class AuditController {
    static async getTransactionLedger(req, res) {
        try {
            const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
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
                unified.push({
                    id: pos.id,
                    type: 'POS',
                    paymentMethod: 'CARD',
                    amount: pos.amount || 0,
                    status: pos.status || 'Pending',
                    staffName: pos.staff_name || pos.staffName || 'System',
                    date: pos.created_at || pos.date,
                    items: pos.items_jsonb || pos.items || [],
                    customerName: 'Cardholder',
                    reference: pos.rrn || pos.id
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