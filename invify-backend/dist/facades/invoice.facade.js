"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceFacade = void 0;
const invoice_application_service_1 = require("../services/invoice-application.service");
const supabase_1 = require("../db/supabase");
const app_1 = require("../app");
const gov_audit_service_1 = require("../services/gov-audit.service");
const crypto_1 = require("crypto");
const pg_1 = require("../db/pg");
const ledger_service_1 = require("../services/ledger.service");
class InvoiceFacade {
    /**
     * The canonical entry point for creating an invoice, shared by REST and Sync.
     * Delegates the actual ACID transaction to InvoiceApplicationService.
     */
    static async createInvoice(payload, context, idempotencyKey, correlationId) {
        // 1. Delegate business logic (reusing offline engine)
        await invoice_application_service_1.InvoiceApplicationService.processOfflineInvoice(payload, context, idempotencyKey, correlationId);
        // 2. We do NOT duplicate ledger or audit logic here because processOfflineInvoice already handles it.
        // We only trigger transport-agnostic realtime events that the dashboard might rely on.
        app_1.io.to(`tenant:${context.tenantId}`).emit('finance.invoice.created', payload);
        return { success: true, syncId: payload.syncId };
    }
    static async getInvoices(tenantId, filters = {}) {
        let query = supabase_1.supabaseAdmin.from('invoices').select('*, customer:customer_id(*)').eq('tenant_id', tenantId);
        if (filters.status)
            query = query.eq('payment_status', filters.status);
        if (filters.limit)
            query = query.limit(filters.limit);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw new Error(error.message);
        return data;
    }
    static async getInvoice(tenantId, id) {
        const { data: invoice, error } = await supabase_1.supabaseAdmin
            .from('invoices')
            .select('*, customer:customer_id(*)')
            .eq('tenant_id', tenantId)
            .eq('id', id)
            .single();
        if (error)
            throw new Error(error.message);
        const { data: items, error: itemsError } = await supabase_1.supabaseAdmin
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', id);
        if (itemsError)
            throw new Error(itemsError.message);
        return { ...invoice, items };
    }
    static async recordPayment(tenantId, id, payload) {
        const client = await (0, pg_1.getClient)();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query('SELECT total_amount, amount_paid, balance_amount, payment_status FROM invoices WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [id, tenantId]);
            if (rows.length === 0)
                throw new Error('Invoice not found');
            const inv = rows[0];
            const newAmountPaid = Number(inv.amount_paid) + Number(payload.amount);
            const newBalance = Number(inv.total_amount) - newAmountPaid;
            const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';
            await client.query('UPDATE invoices SET amount_paid = $1, balance_amount = $2, payment_status = $3, updated_at = NOW() WHERE id = $4', [newAmountPaid, newBalance, newStatus, id]);
            // Ledger entry for manual payment
            await ledger_service_1.LedgerService.createDoubleEntry({
                idempotencyKey: (0, crypto_1.randomUUID)(),
                tenantId,
                reference: `PAY-${id}-${Date.now()}`,
                entries: [
                    { account: 'EXTERNAL_BANK', type: 'DEBIT', amount: payload.amount },
                    { account: 'USER_WALLET', type: 'CREDIT', amount: payload.amount }
                ],
                metadata: {
                    source: 'invoice_payment',
                    invoiceId: id,
                    paymentMethod: payload.paymentMethod
                }
            }, { pgClient: client });
            await gov_audit_service_1.GovAuditService.logAction({
                id: `gov-${Date.now()}-${(0, crypto_1.randomUUID)().slice(0, 5)}`,
                timestamp: new Date().toISOString(),
                module: 'FINANCIAL',
                action: 'INVOICE_PAYMENT_RECORDED',
                user_email: payload.userEmail || 'system',
                user_name: payload.userName || 'System',
                ip_address: payload.ip || '127.0.0.1',
                target: id,
                status: 'success',
                metadata: { amount: payload.amount, method: payload.paymentMethod }
            });
            await client.query('COMMIT');
            app_1.io.to(`tenant:${tenantId}`).emit('finance.invoice.payment_recorded', { invoiceId: id, amount: payload.amount, status: newStatus });
            return { success: true, newStatus, newBalance };
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    static async getTimeline(tenantId, id) {
        // Leverage GovAuditService to fetch audit logs for this specific invoice
        return await gov_audit_service_1.GovAuditService.getLedger({ search: id });
    }
}
exports.InvoiceFacade = InvoiceFacade;
//# sourceMappingURL=invoice.facade.js.map