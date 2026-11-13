"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceController = void 0;
const invoice_facade_1 = require("../facades/invoice.facade");
const crypto_1 = require("crypto");
const finance_tenant_1 = require("../utils/finance-tenant");
function tenantFromRequest(req, res) {
    try {
        return (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
    }
    catch (err) {
        res.status(err?.status || 403).json({
            success: false,
            message: err?.message || 'Forbidden: Cross-tenant access denied',
        });
        return null;
    }
}
class InvoiceController {
    static async createInvoice(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const deviceId = req.headers['x-device-id'] || 'dashboard';
            const correlationId = req.correlationId || req.headers['x-correlation-id'] || (0, crypto_1.randomUUID)();
            const idempotencyKey = req.headers['x-idempotency-key'] || (0, crypto_1.randomUUID)();
            if (!tenantId) {
                return res.status(401).json({ success: false, message: 'Tenant ID required' });
            }
            // Generate a syncId for the dashboard request if it doesn't have one (so logic matches Flutter)
            const payload = {
                ...req.body,
                syncId: req.body.syncId || (0, crypto_1.randomUUID)(),
                dateCreated: req.body.dateCreated || new Date().toISOString()
            };
            const result = await invoice_facade_1.InvoiceFacade.createInvoice(payload, { tenantId, deviceId }, idempotencyKey, correlationId);
            return res.status(201).json(result);
        }
        catch (err) {
            console.error(`[InvoiceController.createInvoice] Error: ${err.message}`);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    static async bulkSyncInvoices(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const deviceId = req.headers['x-device-id'] || 'dashboard';
            const { invoices } = req.body;
            if (!tenantId) {
                return res.status(401).json({ success: false, message: 'Tenant ID required' });
            }
            if (!Array.isArray(invoices) || invoices.length === 0) {
                return res.status(400).json({ success: false, message: 'invoices array is required and must not be empty.' });
            }
            let synced = 0;
            const errors = [];
            const concurrency = Math.min(6, invoices.length);
            let nextIndex = 0;
            const worker = async () => {
                while (true) {
                    const i = nextIndex++;
                    if (i >= invoices.length)
                        return;
                    const invoice = invoices[i];
                    try {
                        const idempotencyKey = invoice.idempotencyKey || invoice.syncId || (0, crypto_1.randomUUID)();
                        const correlationId = invoice.correlationId || (0, crypto_1.randomUUID)();
                        await invoice_facade_1.InvoiceFacade.createInvoice(invoice, { tenantId, deviceId, skipTenantEmail: true, skipNotify: true }, idempotencyKey, correlationId);
                        synced++;
                    }
                    catch (err) {
                        console.error(`[InvoiceController.bulkSyncInvoices] Failed for invoice ${invoice.invoiceNumber || invoice.syncId}: ${err.message}`);
                        errors.push(`${invoice.invoiceNumber || invoice.syncId}: ${err.message}`);
                    }
                }
            };
            await Promise.all(Array.from({ length: concurrency }, () => worker()));
            if (synced > 0) {
                const { TenantAlertService } = require('../services/tenant-alert.service');
                const total = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || inv.total_amount || 0), 0);
                TenantAlertService.notifyTransaction(tenantId, { count: synced, amount: total });
                try {
                    const { io } = require('../app');
                    io.to(`tenant:${tenantId}`).emit('finance.sync.completed', {
                        synced,
                        errors: errors.length,
                        at: new Date().toISOString(),
                    });
                }
                catch (emitErr) {
                    console.warn('[InvoiceController.bulkSyncInvoices] realtime emit skipped:', emitErr?.message || emitErr);
                }
            }
            return res.status(200).json({
                success: errors.length === 0,
                synced,
                errors
            });
        }
        catch (err) {
            console.error(`[InvoiceController.bulkSyncInvoices] Fatal: ${err.message}`);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    static async getInvoices(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!tenantId)
                return res.status(401).json({ success: false, message: 'Tenant ID required' });
            const filters = req.query;
            const data = await invoice_facade_1.InvoiceFacade.getInvoices(tenantId, filters);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    static async getInvoice(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!tenantId)
                return res.status(401).json({ success: false, message: 'Tenant ID required' });
            const { id } = req.params;
            const data = await invoice_facade_1.InvoiceFacade.getInvoice(tenantId, id);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    static async recordPayment(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!tenantId)
                return res.status(401).json({ success: false, message: 'Tenant ID required' });
            const { id } = req.params;
            const user = req.user || {};
            const idempotencyKey = String(req.headers['x-idempotency-key'] || req.body?.idempotencyKey || req.body?.commandId || '').trim();
            const payload = {
                ...req.body,
                idempotencyKey,
                userEmail: user.email,
                userName: user.name,
                ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress
            };
            const data = await invoice_facade_1.InvoiceFacade.recordPayment(tenantId, id, payload);
            return res.status(200).json(data);
        }
        catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ success: false, ack: 'rejected', message: err.message });
        }
    }
    static async getTimeline(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!tenantId)
                return res.status(401).json({ success: false, message: 'Tenant ID required' });
            const { id } = req.params;
            const data = await invoice_facade_1.InvoiceFacade.getTimeline(tenantId, id);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.InvoiceController = InvoiceController;
//# sourceMappingURL=invoice.controller.js.map