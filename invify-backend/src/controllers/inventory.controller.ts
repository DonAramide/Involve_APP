import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { AuditService } from '../services/audit.service';
import { resolveAuthoritativeTenantId } from '../utils/finance-tenant';
import { actorFromRequest } from '../catalog/catalog-rbac.middleware';
import { canViewCostPrice } from '../catalog/catalog-permissions';
import { CatalogService } from '../catalog/catalog.service';
import { CatalogSchemaUnavailableError } from '../catalog/catalog-store';
import { isCatalogTestRuntime, publishCatalogLive } from '../catalog/catalog-live';
import { CATALOG_SCHEMA_UNAVAILABLE } from '../catalog/catalog-write-policy';

function tenantFromRequest(req: Request, res: Response): string | null {
  try {
    return resolveAuthoritativeTenantId(req);
  } catch (err: any) {
    res.status(err?.status || 403).json({ error: err?.message || 'Forbidden' });
    return null;
  }
}

function withCostPolicy<T>(req: Request, data: T): T {
  return InventoryService.presentItem(data as any, canViewCostPrice(actorFromRequest(req))) as T;
}

function withCostPolicyList(req: Request, items: any[]) {
  return InventoryService.presentItems(items || [], canViewCostPrice(actorFromRequest(req)));
}

export class InventoryController {
  
  // ==========================================
  // ITEMS
  // ==========================================
  static async searchItems(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const { q } = req.query;
      const data = await InventoryService.searchItems(tenantId, q as string);
      return res.status(200).json({ items: withCostPolicyList(req, (data as any).items) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getItem(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const data = await InventoryService.getItem(tenantId, req.params.id);
      return res.status(200).json(withCostPolicy(req, data));
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async createItem(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const actor = actorFromRequest(req);
      if (!canViewCostPrice(actor)) {
        delete (req.body as any).cost_price;
        delete (req.body as any).costPrice;
      }
      if (isCatalogTestRuntime()) {
        const published = await CatalogService.get().createItem(actor, tenantId, req.body);
        return res.status(201).json(withCostPolicy(req, { ...published.item, catalog_version: published.catalog_version }));
      }
      try {
        const live = await publishCatalogLive({
          tenantId,
          entityType: 'item',
          entityId: req.body?.id || '',
          op: 'upsert',
          item: req.body,
          payload: req.body || {},
          changedBy: actor.userId || null,
        });
        return res.status(201).json(withCostPolicy(req, live));
      } catch (err: any) {
        if (err instanceof CatalogSchemaUnavailableError) {
          return res.status(503).json(CATALOG_SCHEMA_UNAVAILABLE);
        }
        throw err;
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  /**
   * POST /api/inventory/products/bulk-sync
   * Accepts an array of products from the mobile app and upserts them all.
   * Idempotent — safe to call multiple times (uses SKU+tenant upsert).
   */
  static async bulkSyncItems(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const { items } = req.body as { items: any[] };

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items array is required and must not be empty.' });
      }

      const result = await InventoryService.bulkUpsertItems(tenantId, items);
      await AuditService.log({
        eventType: 'inventory.product.bulk_sync' as any,
        reference: `BULK-SYNC-${tenantId}`,
        tenantId,
        payload: { synced: result.synced, errors: result.errors.length },
      });

      return res.status(200).json({
        success: result.errors.length === 0,
        synced: result.synced,
        errors: result.errors,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async updateItem(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const actor = actorFromRequest(req);
      if (!canViewCostPrice(actor)) {
        delete (req.body as any).cost_price;
        delete (req.body as any).costPrice;
      }
      if (isCatalogTestRuntime()) {
        const published = await CatalogService.get().updateItem(actor, tenantId, req.params.id, req.body);
        return res.status(200).json(withCostPolicy(req, { ...published.item, catalog_version: published.catalog_version }));
      }
      try {
        const live = await publishCatalogLive({
          tenantId,
          entityType: 'item',
          entityId: req.params.id,
          op: 'upsert',
          item: { ...req.body, id: req.params.id },
          payload: req.body || {},
          changedBy: actor.userId || null,
        });
        return res.status(200).json(withCostPolicy(req, live));
      } catch (err: any) {
        if (err instanceof CatalogSchemaUnavailableError) {
          return res.status(503).json(CATALOG_SCHEMA_UNAVAILABLE);
        }
        throw err;
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async archiveItem(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const actor = actorFromRequest(req);
      if (isCatalogTestRuntime()) {
        await CatalogService.get().updateItem(actor, tenantId, req.params.id, { status: 'archived' });
        return res.status(200).json({ success: true, published: true });
      }
      try {
        await publishCatalogLive({
          tenantId,
          entityType: 'item',
          entityId: req.params.id,
          op: 'archive',
          item: { id: req.params.id },
          payload: { id: req.params.id },
          changedBy: actor.userId || null,
        });
        return res.status(200).json({ success: true, published: true });
      } catch (err: any) {
        if (err instanceof CatalogSchemaUnavailableError) {
          return res.status(503).json(CATALOG_SCHEMA_UNAVAILABLE);
        }
        throw err;
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ==========================================
  // STOCK
  // ==========================================
  static async getLowStock(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const data = await InventoryService.getLowStock(tenantId);
      return res.status(200).json({ items: withCostPolicyList(req, (data as any).items) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getOutOfStock(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const data = await InventoryService.getOutOfStock(tenantId);
      return res.status(200).json({ items: withCostPolicyList(req, (data as any).items) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getStockSummary(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const data = await InventoryService.getStockSummary(tenantId);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getStockHistory(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const data = await InventoryService.getStockHistory(tenantId, req.params.id);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ==========================================
  // CATEGORIES
  // ==========================================
  static async getCategories(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const data = await InventoryService.getCategories(tenantId);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async createCategory(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      if (!req.body.name) return res.status(400).json({ error: 'Category name is required.' });
      const actor = actorFromRequest(req);
      if (isCatalogTestRuntime()) {
        const published = await CatalogService.get().createCategory(actor, tenantId, req.body);
        return res.status(201).json({ ...published.category, catalog_version: published.catalog_version });
      }
      try {
        const live = await publishCatalogLive({
          tenantId,
          entityType: 'category',
          entityId: req.body?.id || '',
          op: 'upsert',
          category: req.body,
          payload: req.body || {},
          changedBy: actor.userId || null,
        });
        return res.status(201).json(live);
      } catch (err: any) {
        if (err instanceof CatalogSchemaUnavailableError) {
          return res.status(503).json(CATALOG_SCHEMA_UNAVAILABLE);
        }
        throw err;
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async updateCategory(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const actor = actorFromRequest(req);
      if (isCatalogTestRuntime()) {
        const published = await CatalogService.get().updateCategory(actor, tenantId, req.params.id, req.body);
        return res.status(200).json({ ...published.category, catalog_version: published.catalog_version });
      }
      try {
        const live = await publishCatalogLive({
          tenantId,
          entityType: 'category',
          entityId: req.params.id,
          op: 'upsert',
          category: { ...req.body, id: req.params.id },
          payload: req.body || {},
          changedBy: actor.userId || null,
        });
        return res.status(200).json(live);
      } catch (err: any) {
        if (err instanceof CatalogSchemaUnavailableError) {
          return res.status(503).json(CATALOG_SCHEMA_UNAVAILABLE);
        }
        throw err;
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ==========================================
  // SUPPLIERS
  // ==========================================
  static async getSuppliers(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const data = await InventoryService.getSuppliers(tenantId);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async createSupplier(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      if (!req.body.name) return res.status(400).json({ error: 'Supplier name is required.' });
      const data = await InventoryService.createSupplier(tenantId, req.body);
      await AuditService.log({ eventType: 'inventory.supplier.created' as any, reference: `SUP-${data.id}`, tenantId, payload: { id: data.id, name: data.name } });
      return res.status(201).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async addStock(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const { id } = req.params;
      const { quantity, notes } = req.body;
      if (!quantity || isNaN(Number(quantity))) {
        return res.status(400).json({ error: 'quantity must be a valid number.' });
      }
      const data = await InventoryService.addStock(tenantId, id, Number(quantity), notes);
      await AuditService.log({ eventType: 'inventory.stock.added' as any, reference: `STK-${id}`, tenantId, payload: { itemId: id, quantity } });
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(e.message.includes('not found') ? 404 : 500).json({ error: e.message });
    }
  }
}
