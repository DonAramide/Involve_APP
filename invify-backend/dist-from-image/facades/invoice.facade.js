"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceFacade = void 0;
const invoice_application_service_1 = require("../services/invoice-application.service");
const supabase_1 = require("../db/supabase");
const app_1 = require("../app");
const gov_audit_service_1 = require("../services/gov-audit.service");
const crypto_1 = require("crypto");
const whatsapp_notification_service_1 = require("../services/whatsapp-notification.service");
const tenant_alert_service_1 = require("../services/tenant-alert.service");
const present_invoice_1 = require("../utils/present-invoice");
const invoice_payment_service_1 = require("../services/invoice-payment.service");
class InvoiceFacade {
    static presentInvoice = present_invoice_1.presentInvoice;
    /**
     * The canonical entry point for creating an invoice, shared by REST and Sync.
     * Delegates the actual ACID transaction to InvoiceApplicationService.
     */
    static async createInvoice(payload, context, idempotencyKey, correlationId) {
        const processed = await invoice_application_service_1.InvoiceApplicationService.processOfflineInvoice(payload, context, idempotencyKey, correlationId);
        app_1.io.to(`tenant:${context.tenantId}`).emit('finance.invoice.created', payload);
        // 3. WhatsApp invoice notification (non-fatal — never rolls back invoice persistence)
        if (!context.skipNotify) {
            try {
                const invoiceId = String(payload.id || payload.invoiceId || payload.syncId || idempotencyKey);
                whatsapp_notification_service_1.WhatsAppNotificationService.notifyInvoiceCreated({
                    tenantId: context.tenantId,
                    customerId: payload.customerId || payload.customer_id || null,
                    invoiceId,
                    invoiceNumber: payload.invoiceNumber || payload.localInvoiceNumber || invoiceId,
                    amount: payload.totalAmount ?? payload.total_amount ?? payload.amount,
                    currency: payload.currency || 'NGN',
                    recipientPhone: payload.customerPhone || payload.customer_phone || null,
                    customerName: payload.customerName || payload.customer_name,
                    dueDate: payload.dueDate || payload.due_date,
                });
            }
            catch (e) {
                console.error('[InvoiceFacade] WhatsApp invoice notify failed (non-fatal):', e?.message || e);
            }
        }
        if (!context.skipTenantEmail && !processed?.alreadyExists) {
            tenant_alert_service_1.TenantAlertService.notifyTransaction(context.tenantId, {
                invoiceNumber: payload.invoiceNumber || payload.localInvoiceNumber,
                amount: Number(payload.totalAmount ?? payload.total_amount ?? payload.amountPaid ?? 0),
                customerName: payload.customerName || payload.customer_name,
            });
        }
        return { success: true, syncId: payload.syncId };
    }
    static async getInvoices(tenantId, filters = {}) {
        let query = supabase_1.supabaseAdmin.from('invoices').select('*, customer:customer_id(*)').eq('tenant_id', tenantId);
        if (filters.status)
            query = query.eq('payment_status', filters.status);
        if (filters.limit)
            query = query.limit(filters.limit);
        let { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
            let fallback = supabase_1.supabaseAdmin.from('invoices').select('*').eq('tenant_id', tenantId);
            if (filters.status)
                fallback = fallback.eq('payment_status', filters.status);
            if (filters.limit)
                fallback = fallback.limit(filters.limit);
            const retry = await fallback.order('created_at', { ascending: false });
            if (retry.error)
                throw new Error(error.message);
            data = retry.data;
        }
        return (data || []).map((row) => InvoiceFacade.presentInvoice(row));
    }
    static async getInvoice(tenantId, id) {
        const { data: invoice, error } = await supabase_1.supabaseAdmin
            .from('invoices')
            .select('*, customer:customer_id(*)')
            .eq('tenant_id', tenantId)
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        if (!invoice)
            return null;
        const { data: items, error: itemsError } = await supabase_1.supabaseAdmin
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', id);
        if (itemsError)
            throw new Error(itemsError.message);
        const itemIds = (items || []).map((i) => i.item_id).filter(Boolean);
        const itemMap = {};
        if (itemIds.length > 0) {
            const { data: dbItems, error: dbItemsErr } = await supabase_1.supabaseAdmin
                .from('items')
                .select('id, name')
                .in('id', itemIds);
            if (dbItemsErr)
                console.error('Error fetching item details:', dbItemsErr);
            if (dbItems) {
                dbItems.forEach((it) => {
                    itemMap[it.id] = it.name;
                });
            }
        }
        const enrichedItems = (items || []).map((i) => ({
            ...i,
            name: itemMap[i.item_id] || 'Product Item',
            total: Number(i.quantity || 0) * Number(i.unit_price || 0)
        }));
        return InvoiceFacade.presentInvoice({ ...invoice, items: enrichedItems });
    }
    static async recordPayment(tenantId, id, payload) {
        const result = await invoice_payment_service_1.InvoicePaymentService.apply(tenantId, id, payload);
        if (result.ack === 'rejected') {
            const err = new Error(result.reason || 'payment_rejected');
            err.status = 409;
            throw err;
        }
        const applySideEffects = async (newStatus, newBalance) => {
            app_1.io.to(`tenant:${tenantId}`).emit('finance.invoice.payment_recorded', {
                invoiceId: id,
                amount: payload.amount,
                status: newStatus,
            });
            try {
                const receiptId = `pay-${id}-${Date.now()}`;
                let recipientPhone = payload.customerPhone || payload.customer_phone || null;
                let customerId = payload.customerId || payload.customer_id || null;
                let customerName = payload.customerName || payload.customer_name;
                if (!recipientPhone) {
                    const { data: invRow } = await supabase_1.supabaseAdmin
                        .from('invoices')
                        .select('customer_id, customer:customer_id(id, phone, name)')
                        .eq('id', id)
                        .eq('tenant_id', tenantId)
                        .maybeSingle();
                    const customer = invRow?.customer;
                    recipientPhone = customer?.phone || null;
                    customerId = customerId || customer?.id || invRow?.customer_id || null;
                    customerName = customerName || customer?.name;
                }
                whatsapp_notification_service_1.WhatsAppNotificationService.notifyReceipt({
                    tenantId,
                    invoiceId: id,
                    receiptId,
                    amount: payload.amount,
                    currency: payload.currency || 'NGN',
                    recipientPhone,
                    customerName,
                    customerId,
                    reference: receiptId,
                });
            }
            catch (e) {
                console.error('[InvoiceFacade] WhatsApp receipt notify failed (non-fatal):', e?.message || e);
            }
            return { success: true, ack: result.ack, newStatus, newBalance, amountPaid: result.amountPaid };
        };
        if (result.ack === 'accepted' && result.confirmation !== 'unconfirmed') {
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
                metadata: { amount: payload.amount, method: payload.paymentMethod, ack: result.ack },
            });
        }
        const side = await applySideEffects(result.newStatus, result.newBalance);
        return { ...side, ack: result.ack, reason: result.reason, confirmation: result.confirmation, amountPaid: result.amountPaid };
    }
    static async getTimeline(tenantId, id) {
        // Leverage GovAuditService to fetch audit logs for this specific invoice
        return await gov_audit_service_1.GovAuditService.getLedger({ search: id });
    }
}
exports.InvoiceFacade = InvoiceFacade;
//# sourceMappingURL=invoice.facade.js.map