"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogController = void 0;
const catalog_service_1 = require("../catalog/catalog.service");
const catalog_rbac_middleware_1 = require("../catalog/catalog-rbac.middleware");
const catalog_permissions_1 = require("../catalog/catalog-permissions");
const catalog_payload_1 = require("../catalog/catalog-payload");
const catalog_live_1 = require("../catalog/catalog-live");
const inventory_service_1 = require("../services/inventory.service");
const audit_service_1 = require("../services/audit.service");
const finance_tenant_1 = require("../utils/finance-tenant");
function tenantFromRequest(req, res) {
    try {
        return (0, finance_tenant_1.resolveAuthoritativeTenantId)(req);
    }
    catch (err) {
        res.status(err?.status || 403).json({ error: err?.message || 'Forbidden' });
        return null;
    }
}
function fail(res, err) {
    return res.status(err?.status || 500).json({ error: err?.message || 'Catalog error', code: err?.code });
}
function emitVersionHint(tenantId, version) {
    try {
        const { io } = require('../app');
        io.to(`tenant:${tenantId}`).emit('catalog.version_available', {
            tenantId,
            catalog_version: version,
            at: new Date().toISOString(),
        });
    }
    catch (emitErr) {
        console.warn('[CatalogController] realtime hint skipped:', emitErr?.message || emitErr);
    }
}
class CatalogController {
    static async listItems(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            if ((0, catalog_live_1.isCatalogTestRuntime)()) {
                const data = catalog_service_1.CatalogService.get().listItems(actor, tenantId);
                return res.status(200).json({ items: data });
            }
            const { items } = await inventory_service_1.InventoryService.listShopCatalog(tenantId);
            const shop = items.filter((row) => (0, catalog_payload_1.isShopCatalogItem)(row));
            return res.status(200).json({
                items: (0, catalog_payload_1.presentCatalogItems)(shop, { includeCost: (0, catalog_permissions_1.canViewCostPrice)(actor) }),
            });
        }
        catch (err) {
            return fail(res, err);
        }
    }
    static async getItem(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const data = catalog_service_1.CatalogService.get().getItem((0, catalog_rbac_middleware_1.actorFromRequest)(req), tenantId, req.params.id);
            return res.status(200).json(data);
        }
        catch (err) {
            return fail(res, err);
        }
    }
    static async createItem(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            const idempotencyKey = String(req.headers['idempotency-key'] || '').trim() || undefined;
            if (!(0, catalog_live_1.isCatalogTestRuntime)()) {
                const live = await (0, catalog_live_1.publishCatalogLive)({
                    tenantId,
                    idempotencyKey,
                    entityType: 'item',
                    entityId: req.body?.id || '',
                    op: 'upsert',
                    item: req.body,
                    payload: req.body || {},
                    changedBy: actor.userId || null,
                });
                emitVersionHint(tenantId, live?.catalog_version);
                return res.status(201).json((0, catalog_payload_1.presentCatalogItem)(live, { includeCost: (0, catalog_permissions_1.canViewCostPrice)(actor) }));
            }
            const result = await catalog_service_1.CatalogService.get().createItem(actor, tenantId, req.body, idempotencyKey);
            await audit_service_1.AuditService.log({
                eventType: 'inventory.product.created',
                reference: `CAT-${result.item?.id}`,
                tenantId,
                payload: { id: result.item?.id, catalog_version: result.catalog_version },
            });
            emitVersionHint(tenantId, result.catalog_version);
            return res.status(201).json({
                ...(0, catalog_payload_1.presentCatalogItem)(result.item, { includeCost: (0, catalog_permissions_1.canViewCostPrice)(actor) }),
                catalog_version: result.catalog_version,
                replayed: result.replayed || false,
            });
        }
        catch (err) {
            return fail(res, err);
        }
    }
    static async updateItem(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            const idempotencyKey = String(req.headers['idempotency-key'] || '').trim() || undefined;
            if (!(0, catalog_live_1.isCatalogTestRuntime)()) {
                const live = await (0, catalog_live_1.publishCatalogLive)({
                    tenantId,
                    idempotencyKey,
                    entityType: 'item',
                    entityId: req.params.id,
                    op: 'upsert',
                    item: { ...req.body, id: req.params.id },
                    payload: req.body || {},
                    changedBy: actor.userId || null,
                });
                emitVersionHint(tenantId, live?.catalog_version);
                return res.status(200).json((0, catalog_payload_1.presentCatalogItem)(live, { includeCost: (0, catalog_permissions_1.canViewCostPrice)(actor) }));
            }
            const result = await catalog_service_1.CatalogService.get().updateItem(actor, tenantId, req.params.id, req.body, idempotencyKey);
            await audit_service_1.AuditService.log({
                eventType: 'inventory.product.updated',
                reference: `CAT-${req.params.id}`,
                tenantId,
                payload: { id: req.params.id, catalog_version: result.catalog_version },
            });
            emitVersionHint(tenantId, result.catalog_version);
            return res.status(200).json({
                ...(0, catalog_payload_1.presentCatalogItem)(result.item, { includeCost: (0, catalog_permissions_1.canViewCostPrice)(actor) }),
                catalog_version: result.catalog_version,
                replayed: result.replayed || false,
            });
        }
        catch (err) {
            return fail(res, err);
        }
    }
    static async listCategories(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if ((0, catalog_live_1.isCatalogTestRuntime)()) {
                const categories = catalog_service_1.CatalogService.get().listCategories((0, catalog_rbac_middleware_1.actorFromRequest)(req), tenantId);
                return res.status(200).json({ categories });
            }
            const data = await inventory_service_1.InventoryService.getCategories(tenantId);
            return res.status(200).json(data);
        }
        catch (err) {
            return fail(res, err);
        }
    }
    static async createCategory(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            const idempotencyKey = String(req.headers['idempotency-key'] || '').trim() || undefined;
            if (!(0, catalog_live_1.isCatalogTestRuntime)()) {
                const live = await (0, catalog_live_1.publishCatalogLive)({
                    tenantId,
                    idempotencyKey,
                    entityType: 'category',
                    entityId: req.body?.id || '',
                    op: 'upsert',
                    category: req.body,
                    payload: req.body || {},
                    changedBy: actor.userId || null,
                });
                emitVersionHint(tenantId, live?.catalog_version);
                return res.status(201).json(live);
            }
            const result = await catalog_service_1.CatalogService.get().createCategory(actor, tenantId, req.body, idempotencyKey);
            await audit_service_1.AuditService.log({
                eventType: 'inventory.category.created',
                reference: `CATC-${result.category?.id}`,
                tenantId,
                payload: { id: result.category?.id, catalog_version: result.catalog_version },
            });
            emitVersionHint(tenantId, result.catalog_version);
            return res.status(201).json({ ...result.category, catalog_version: result.catalog_version, replayed: result.replayed || false });
        }
        catch (err) {
            return fail(res, err);
        }
    }
    static async updateCategory(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            const idempotencyKey = String(req.headers['idempotency-key'] || '').trim() || undefined;
            if (!(0, catalog_live_1.isCatalogTestRuntime)()) {
                const live = await (0, catalog_live_1.publishCatalogLive)({
                    tenantId,
                    idempotencyKey,
                    entityType: 'category',
                    entityId: req.params.id,
                    op: 'upsert',
                    category: { ...req.body, id: req.params.id },
                    payload: req.body || {},
                    changedBy: actor.userId || null,
                });
                emitVersionHint(tenantId, live?.catalog_version);
                return res.status(200).json(live);
            }
            const result = await catalog_service_1.CatalogService.get().updateCategory(actor, tenantId, req.params.id, req.body, idempotencyKey);
            emitVersionHint(tenantId, result.catalog_version);
            return res.status(200).json({ ...result.category, catalog_version: result.catalog_version, replayed: result.replayed || false });
        }
        catch (err) {
            return fail(res, err);
        }
    }
    static async getChanges(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const since = Number(req.query.since_version || 0);
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            if (!(0, catalog_live_1.isCatalogTestRuntime)()) {
                const live = await (0, catalog_live_1.readCatalogChangesLive)(tenantId, since);
                const includeCost = (0, catalog_permissions_1.canViewCostPrice)(actor);
                const changes = (live.changes || [])
                    .filter((event) => event.entity_type !== 'item' || (0, catalog_payload_1.isShopCatalogItem)(event.payload))
                    .map((event) => ({
                    ...event,
                    payload: includeCost ? event.payload : (0, catalog_payload_1.presentCatalogItem)(event.payload, { includeCost: false }),
                }));
                return res.status(200).json({ catalog_version: live.catalog_version, changes });
            }
            const data = catalog_service_1.CatalogService.get().getChanges(actor, tenantId, since);
            return res.status(200).json(data);
        }
        catch (err) {
            return fail(res, err);
        }
    }
    static async ackDevice(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            const actor = (0, catalog_rbac_middleware_1.actorFromRequest)(req);
            const deviceId = String(req.body?.device_id || actor.deviceId || '');
            const applied = Number(req.body?.applied_version ?? req.body?.last_applied_version);
            if (!(0, catalog_live_1.isCatalogTestRuntime)()) {
                const published = await (0, catalog_live_1.readCatalogChangesLive)(tenantId, 0);
                if (Number(applied) > Number(published.catalog_version)) {
                    const err = new Error('Cannot acknowledge a catalog version that has not been published');
                    err.status = 409;
                    throw err;
                }
                const status = Number(applied) === Number(published.catalog_version) ? 'up_to_date' : 'pending';
                const data = await (0, catalog_live_1.ackCatalogDeviceLive)({
                    tenant_id: tenantId,
                    device_id: deviceId,
                    last_applied_version: Number(applied || 0),
                    last_sync_at: new Date().toISOString(),
                    last_acknowledged_at: new Date().toISOString(),
                    sync_status: status,
                    last_error: null,
                });
                return res.status(200).json(data);
            }
            const data = catalog_service_1.CatalogService.get().acknowledge(actor, tenantId, deviceId, applied);
            return res.status(200).json(data);
        }
        catch (err) {
            return fail(res, err);
        }
    }
    static async syncStatus(req, res) {
        try {
            const tenantId = tenantFromRequest(req, res);
            if (!tenantId)
                return;
            if (!(0, catalog_live_1.isCatalogTestRuntime)()) {
                const live = await (0, catalog_live_1.listCatalogDeviceSyncLive)(tenantId);
                return res.status(200).json(live);
            }
            const data = catalog_service_1.CatalogService.get().listDeviceSync((0, catalog_rbac_middleware_1.actorFromRequest)(req), tenantId);
            return res.status(200).json(data);
        }
        catch (err) {
            return fail(res, err);
        }
    }
}
exports.CatalogController = CatalogController;
//# sourceMappingURL=catalog.controller.js.map