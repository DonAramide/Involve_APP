"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const inventory_service_1 = require("../services/inventory.service");
const audit_service_1 = require("../services/audit.service");
const finance_tenant_1 = require("../utils/finance-tenant");
const catalog_rbac_middleware_1 = require("../catalog/catalog-rbac.middleware");
const catalog_permissions_1 = require("../catalog/catalog-permissions");
const catalog_service_1 = require("../catalog/catalog.service");
const catalog_store_1 = require("../catalog/catalog-store");
const catalog_live_1 = require("../catalog/catalog-live");
const catalog_write_policy_1 = require("../catalog/catalog-write-policy");
function tenantFromRequest(req, res) {
    try {
        return (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
    }
    catch (err) {
        res.status(err?.status || 403).json({ error: err?.message || 'Forbidden' });
        return null;
    }
}
function withCostPolicy(req, data) {
    return inventory_service_1.InventoryService.presentItem(data, (0, catalog_permissions_1.canViewCostPrice)((0, catalog_rbac_middleware_1.actorFromRequest)(req)));
}
function withCostPolicyList(req, items) {
    return inventory_service_1.InventoryService.presentItems(items || [], (0, catalog_permissions_1.canViewCostPrice)((0, catalog_rbac_middleware_1.actorFromRequest)(req)));
}
class InventoryController {
    // ==========================================
    // ITEMS
    // ==========================================
    static async searchItems(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const { q } = req.query;
            const data = await inventory_service_1.InventoryService.searchItems(tenantId, q);
            return res.status(200).json({ items: withCostPolicyList(req, data.items) });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getItem(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const data = await inventory_service_1.InventoryService.getItem(tenantId, req.params.id);
            return res.status(200).json(withCostPolicy(req, data));
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async createItem(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            if (!(0, catalog_permissions_1.canViewCostPrice)(actor)) {
                delete req.body.cost_price;
                delete req.body.costPrice;
            }
            if ((0, catalog_live_1.isCatalogTestRuntime)()) {
                const published = await catalog_service_1.CatalogService.get().createItem(actor, tenantId, req.body);
                return res.status(201).json(withCostPolicy(req, { ...published.item, catalog_version: published.catalog_version }));
            }
            try {
                const live = await (0, catalog_live_1.publishCatalogLive)({
                    tenantId,
                    entityType: 'item',
                    entityId: req.body?.id || '',
                    op: 'upsert',
                    item: req.body,
                    payload: req.body || {},
                    changedBy: actor.userId || null,
                });
                return res.status(201).json(withCostPolicy(req, live));
            }
            catch (err) {
                if (err instanceof catalog_store_1.CatalogSchemaUnavailableError) {
                    return res.status(503).json(catalog_write_policy_1.CATALOG_SCHEMA_UNAVAILABLE);
                }
                throw err;
            }
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    /**
     * POST /api/inventory/products/bulk-sync
     * Accepts an array of products from the mobile app and upserts them all.
     * Idempotent — safe to call multiple times (uses SKU+tenant upsert).
     */
    static async bulkSyncItems(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const { items } = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ error: 'items array is required and must not be empty.' });
            }
            const result = await inventory_service_1.InventoryService.bulkUpsertItems(tenantId, items);
            await audit_service_1.AuditService.log({
                eventType: 'inventory.product.bulk_sync',
                reference: `BULK-SYNC-${tenantId}`,
                tenantId,
                payload: { synced: result.synced, errors: result.errors.length },
            });
            return res.status(200).json({
                success: result.errors.length === 0,
                synced: result.synced,
                errors: result.errors,
            });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async updateItem(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            if (!(0, catalog_permissions_1.canViewCostPrice)(actor)) {
                delete req.body.cost_price;
                delete req.body.costPrice;
            }
            if ((0, catalog_live_1.isCatalogTestRuntime)()) {
                const published = await catalog_service_1.CatalogService.get().updateItem(actor, tenantId, req.params.id, req.body);
                return res.status(200).json(withCostPolicy(req, { ...published.item, catalog_version: published.catalog_version }));
            }
            try {
                const live = await (0, catalog_live_1.publishCatalogLive)({
                    tenantId,
                    entityType: 'item',
                    entityId: req.params.id,
                    op: 'upsert',
                    item: { ...req.body, id: req.params.id },
                    payload: req.body || {},
                    changedBy: actor.userId || null,
                });
                return res.status(200).json(withCostPolicy(req, live));
            }
            catch (err) {
                if (err instanceof catalog_store_1.CatalogSchemaUnavailableError) {
                    return res.status(503).json(catalog_write_policy_1.CATALOG_SCHEMA_UNAVAILABLE);
                }
                throw err;
            }
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async archiveItem(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            if ((0, catalog_live_1.isCatalogTestRuntime)()) {
                await catalog_service_1.CatalogService.get().updateItem(actor, tenantId, req.params.id, { status: 'archived' });
                return res.status(200).json({ success: true, published: true });
            }
            try {
                await (0, catalog_live_1.publishCatalogLive)({
                    tenantId,
                    entityType: 'item',
                    entityId: req.params.id,
                    op: 'archive',
                    item: { id: req.params.id },
                    payload: { id: req.params.id },
                    changedBy: actor.userId || null,
                });
                return res.status(200).json({ success: true, published: true });
            }
            catch (err) {
                if (err instanceof catalog_store_1.CatalogSchemaUnavailableError) {
                    return res.status(503).json(catalog_write_policy_1.CATALOG_SCHEMA_UNAVAILABLE);
                }
                throw err;
            }
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
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const data = await inventory_service_1.InventoryService.getLowStock(tenantId);
            return res.status(200).json({ items: withCostPolicyList(req, data.items) });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getOutOfStock(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const data = await inventory_service_1.InventoryService.getOutOfStock(tenantId);
            return res.status(200).json({ items: withCostPolicyList(req, data.items) });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getStockSummary(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const data = await inventory_service_1.InventoryService.getStockSummary(tenantId);
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getStockHistory(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
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
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const data = await inventory_service_1.InventoryService.getCategories(tenantId);
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async createCategory(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!req.body.name)
                return res.status(400).json({ error: 'Category name is required.' });
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            if ((0, catalog_live_1.isCatalogTestRuntime)()) {
                const published = await catalog_service_1.CatalogService.get().createCategory(actor, tenantId, req.body);
                return res.status(201).json({ ...published.category, catalog_version: published.catalog_version });
            }
            try {
                const live = await (0, catalog_live_1.publishCatalogLive)({
                    tenantId,
                    entityType: 'category',
                    entityId: req.body?.id || '',
                    op: 'upsert',
                    category: req.body,
                    payload: req.body || {},
                    changedBy: actor.userId || null,
                });
                return res.status(201).json(live);
            }
            catch (err) {
                if (err instanceof catalog_store_1.CatalogSchemaUnavailableError) {
                    return res.status(503).json(catalog_write_policy_1.CATALOG_SCHEMA_UNAVAILABLE);
                }
                throw err;
            }
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async updateCategory(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            if ((0, catalog_live_1.isCatalogTestRuntime)()) {
                const published = await catalog_service_1.CatalogService.get().updateCategory(actor, tenantId, req.params.id, req.body);
                return res.status(200).json({ ...published.category, catalog_version: published.catalog_version });
            }
            try {
                const live = await (0, catalog_live_1.publishCatalogLive)({
                    tenantId,
                    entityType: 'category',
                    entityId: req.params.id,
                    op: 'upsert',
                    category: { ...req.body, id: req.params.id },
                    payload: req.body || {},
                    changedBy: actor.userId || null,
                });
                return res.status(200).json(live);
            }
            catch (err) {
                if (err instanceof catalog_store_1.CatalogSchemaUnavailableError) {
                    return res.status(503).json(catalog_write_policy_1.CATALOG_SCHEMA_UNAVAILABLE);
                }
                throw err;
            }
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
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const data = await inventory_service_1.InventoryService.getSuppliers(tenantId);
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async createSupplier(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!req.body.name)
                return res.status(400).json({ error: 'Supplier name is required.' });
            const data = await inventory_service_1.InventoryService.createSupplier(tenantId, req.body);
            await audit_service_1.AuditService.log({ eventType: 'inventory.supplier.created', reference: `SUP-${data.id}`, tenantId, payload: { id: data.id, name: data.name } });
            return res.status(201).json(data);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async addStock(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const { id } = req.params;
            const { quantity, notes } = req.body;
            if (!quantity || isNaN(Number(quantity))) {
                return res.status(400).json({ error: 'quantity must be a valid number.' });
            }
            const data = await inventory_service_1.InventoryService.addStock(tenantId, id, Number(quantity), notes);
            await audit_service_1.AuditService.log({ eventType: 'inventory.stock.added', reference: `STK-${id}`, tenantId, payload: { itemId: id, quantity } });
            return res.status(200).json(data);
        }
        catch (e) {
            return res.status(e.message.includes('not found') ? 404 : 500).json({ error: e.message });
        }
    }
}
exports.InventoryController = InventoryController;
//# sourceMappingURL=inventory.controller.js.map