import { Request, Response } from 'express';
import { CatalogService } from '../catalog/catalog.service';
import { actorFromRequest } from '../catalog/catalog-rbac.middleware';
import { canViewCostPrice } from '../catalog/catalog-permissions';
import { isShopCatalogItem, presentCatalogItem, presentCatalogItems } from '../catalog/catalog-payload';
import { ackCatalogDeviceLive, isCatalogTestRuntime, listCatalogDeviceSyncLive, publishCatalogLive, readCatalogChangesLive } from '../catalog/catalog-live';
import { InventoryService } from '../services/inventory.service';
import { AuditService } from '../services/audit.service';
import { resolveAuthoritativeTenantId } from '../utils/finance-tenant';

function tenantFromRequest(req: Request, res: Response): string | null {
  try {
    return resolveAuthoritativeTenantId(req);
  } catch (err: any) {
    res.status(err?.status || 403).json({ error: err?.message || 'Forbidden' });
    return null;
  }
}

function fail(res: Response, err: any) {
  return res.status(err?.status || 500).json({ error: err?.message || 'Catalog error', code: err?.code });
}

function emitVersionHint(tenantId: string, version: number) {
  try {
    const { io } = require('../app');
    io.to(`tenant:${tenantId}`).emit('catalog.version_available', {
      tenantId,
      catalog_version: version,
      at: new Date().toISOString(),
    });
  } catch (emitErr: any) {
    console.warn('[CatalogController] realtime hint skipped:', emitErr?.message || emitErr);
  }
}

export class CatalogController {
  static async listItems(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const actor = actorFromRequest(req);
      if (isCatalogTestRuntime()) {
        const data = CatalogService.get().listItems(actor, tenantId);
        return res.status(200).json({ items: data });
      }
      const { items } = await InventoryService.listShopCatalog(tenantId);
      const shop = (items as any[]).filter((row) => isShopCatalogItem(row));
      return res.status(200).json({
        items: presentCatalogItems(shop, { includeCost: canViewCostPrice(actor) }),
      });
    } catch (err: any) {
      return fail(res, err);
    }
  }

  static async getItem(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const data = CatalogService.get().getItem(actorFromRequest(req), tenantId, req.params.id);
      return res.status(200).json(data);
    } catch (err: any) {
      return fail(res, err);
    }
  }

  static async createItem(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const actor = actorFromRequest(req);
      const idempotencyKey = String(req.headers['idempotency-key'] || '').trim() || undefined;
      if (!isCatalogTestRuntime()) {
        const live = await publishCatalogLive({
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
        return res.status(201).json(presentCatalogItem(live, { includeCost: canViewCostPrice(actor) }));
      }
      const result = await CatalogService.get().createItem(
        actor,
        tenantId,
        req.body,
        idempotencyKey,
      );
      await AuditService.log({
        eventType: 'inventory.product.created' as any,
        reference: `CAT-${result.item?.id}`,
        tenantId,
        payload: { id: result.item?.id, catalog_version: result.catalog_version },
      });
      emitVersionHint(tenantId, result.catalog_version);
      return res.status(201).json({
        ...presentCatalogItem(result.item as any, { includeCost: canViewCostPrice(actor) }),
        catalog_version: result.catalog_version,
        replayed: result.replayed || false,
      });
    } catch (err: any) {
      return fail(res, err);
    }
  }

  static async updateItem(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const actor = actorFromRequest(req);
      const idempotencyKey = String(req.headers['idempotency-key'] || '').trim() || undefined;
      if (!isCatalogTestRuntime()) {
        const live = await publishCatalogLive({
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
        return res.status(200).json(presentCatalogItem(live, { includeCost: canViewCostPrice(actor) }));
      }
      const result = await CatalogService.get().updateItem(
        actor,
        tenantId,
        req.params.id,
        req.body,
        idempotencyKey,
      );
      await AuditService.log({
        eventType: 'inventory.product.updated' as any,
        reference: `CAT-${req.params.id}`,
        tenantId,
        payload: { id: req.params.id, catalog_version: result.catalog_version },
      });
      emitVersionHint(tenantId, result.catalog_version);
      return res.status(200).json({
        ...presentCatalogItem(result.item as any, { includeCost: canViewCostPrice(actor) }),
        catalog_version: result.catalog_version,
        replayed: result.replayed || false,
      });
    } catch (err: any) {
      return fail(res, err);
    }
  }

  static async listCategories(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      if (isCatalogTestRuntime()) {
        const categories = CatalogService.get().listCategories(actorFromRequest(req), tenantId);
        return res.status(200).json({ categories });
      }
      const data = await InventoryService.getCategories(tenantId);
      return res.status(200).json(data);
    } catch (err: any) {
      return fail(res, err);
    }
  }

  static async createCategory(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const actor = actorFromRequest(req);
      const idempotencyKey = String(req.headers['idempotency-key'] || '').trim() || undefined;
      if (!isCatalogTestRuntime()) {
        const live = await publishCatalogLive({
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
      const result = await CatalogService.get().createCategory(
        actor,
        tenantId,
        req.body,
        idempotencyKey,
      );
      await AuditService.log({
        eventType: 'inventory.category.created' as any,
        reference: `CATC-${result.category?.id}`,
        tenantId,
        payload: { id: result.category?.id, catalog_version: result.catalog_version },
      });
      emitVersionHint(tenantId, result.catalog_version);
      return res.status(201).json({ ...result.category, catalog_version: result.catalog_version, replayed: result.replayed || false });
    } catch (err: any) {
      return fail(res, err);
    }
  }

  static async updateCategory(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const actor = actorFromRequest(req);
      const idempotencyKey = String(req.headers['idempotency-key'] || '').trim() || undefined;
      if (!isCatalogTestRuntime()) {
        const live = await publishCatalogLive({
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
      const result = await CatalogService.get().updateCategory(
        actor,
        tenantId,
        req.params.id,
        req.body,
        idempotencyKey,
      );
      emitVersionHint(tenantId, result.catalog_version);
      return res.status(200).json({ ...result.category, catalog_version: result.catalog_version, replayed: result.replayed || false });
    } catch (err: any) {
      return fail(res, err);
    }
  }

  static async getChanges(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const since = Number(req.query.since_version || 0);
      const actor = actorFromRequest(req);
      if (!isCatalogTestRuntime()) {
        const live = await readCatalogChangesLive(tenantId, since);
        const includeCost = canViewCostPrice(actor);
        const changes = (live.changes || [])
          .filter((event: any) => event.entity_type !== 'item' || isShopCatalogItem(event.payload))
          .map((event: any) => ({
            ...event,
            payload: includeCost ? event.payload : presentCatalogItem(event.payload, { includeCost: false }),
          }));
        return res.status(200).json({ catalog_version: live.catalog_version, changes });
      }
      const data = CatalogService.get().getChanges(actor, tenantId, since);
      return res.status(200).json(data);
    } catch (err: any) {
      return fail(res, err);
    }
  }

  static async ackDevice(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const actor = actorFromRequest(req);
      const deviceId = String(req.body?.device_id || actor.deviceId || '');
      const applied = Number(req.body?.applied_version ?? req.body?.last_applied_version);
      if (!isCatalogTestRuntime()) {
        const published = await readCatalogChangesLive(tenantId, 0);
        if (Number(applied) > Number(published.catalog_version)) {
          const err: any = new Error('Cannot acknowledge a catalog version that has not been published');
          err.status = 409;
          throw err;
        }
        const status =
          Number(applied) === Number(published.catalog_version) ? 'up_to_date' : 'pending';
        const data = await ackCatalogDeviceLive({
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
      const data = CatalogService.get().acknowledge(actor, tenantId, deviceId, applied);
      return res.status(200).json(data);
    } catch (err: any) {
      return fail(res, err);
    }
  }

  static async syncStatus(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      if (!isCatalogTestRuntime()) {
        const live = await listCatalogDeviceSyncLive(tenantId);
        return res.status(200).json(live);
      }
      const data = CatalogService.get().listDeviceSync(actorFromRequest(req), tenantId);
      return res.status(200).json(data);
    } catch (err: any) {
      return fail(res, err);
    }
  }
}
