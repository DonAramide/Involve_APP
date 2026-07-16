"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceController = void 0;
const invoice_facade_1 = require("../facades/invoice.facade");
const crypto_1 = require("crypto");
class InvoiceController {
    static async createInvoice(req, res) {
        try {
            const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
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
    static async getInvoices(req, res) {
        try {
            const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
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
            const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
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
            const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
            if (!tenantId)
                return res.status(401).json({ success: false, message: 'Tenant ID required' });
            const { id } = req.params;
            const user = req.user || {};
            const payload = {
                ...req.body,
                userEmail: user.email,
                userName: user.name,
                ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress
            };
            const data = await invoice_facade_1.InvoiceFacade.recordPayment(tenantId, id, payload);
            return res.status(200).json(data);
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    static async getTimeline(req, res) {
        try {
            const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
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