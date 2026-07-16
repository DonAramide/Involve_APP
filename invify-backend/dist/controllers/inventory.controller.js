"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const inventory_service_1 = require("../services/inventory.service");
const audit_service_1 = require("../services/audit.service");
class InventoryController {
    // ==========================================
    // ITEMS
    // ==========================================
    static async searchItems(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const { q } = req.query;
            const data = await inventory_service_1.InventoryService.searchItems(tenantId, q);
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getItem(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const data = await inventory_service_1.InventoryService.getItem(tenantId, req.params.id);
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async createItem(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const data = await inventory_service_1.InventoryService.createItem(tenantId, req.body);
            await audit_service_1.AuditService.log({ eventType: 'inventory.product.created', reference: `INV-${data.id}`, tenantId, payload: { id: data.id } });
            return res.status(201).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async updateItem(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const data = await inventory_service_1.InventoryService.updateItem(tenantId, req.params.id, req.body);
            await audit_service_1.AuditService.log({ eventType: 'inventory.product.updated', reference: `INV-${data.id}`, tenantId, payload: { id: data.id } });
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async archiveItem(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            await inventory_service_1.InventoryService.archiveItem(tenantId, req.params.id);
            await audit_service_1.AuditService.log({ eventType: 'inventory.product.archived', reference: `INV-${req.params.id}`, tenantId, payload: { id: req.params.id } });
            return res.status(200).json({ success: true });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    // ==========================================
    // STOCK
    // ==========================================
    static async getLowStock(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const data = await inventory_service_1.InventoryService.getLowStock(tenantId);
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getOutOfStock(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const data = await inventory_service_1.InventoryService.getOutOfStock(tenantId);
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getStockSummary(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const data = await inventory_service_1.InventoryService.getStockSummary(tenantId);
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getStockHistory(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const data = await inventory_service_1.InventoryService.getStockHistory(tenantId, req.params.id);
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    // ==========================================
    // CATEGORIES
    // ==========================================
    static async getCategories(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const data = await inventory_service_1.InventoryService.getCategories(tenantId);
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    // ==========================================
    // SUPPLIERS
    // ==========================================
    static async getSuppliers(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const data = await inventory_service_1.InventoryService.getSuppliers(tenantId);
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.InventoryController = InventoryController;
//# sourceMappingURL=inventory.controller.js.map