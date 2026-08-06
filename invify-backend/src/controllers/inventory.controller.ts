import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { AuditService } from '../services/audit.service';

export class InventoryController {
  
  // ==========================================
  // ITEMS
  // ==========================================
  static async searchItems(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { q } = req.query;
      const data = await InventoryService.searchItems(tenantId, q as string);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getItem(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const data = await InventoryService.getItem(tenantId, req.params.id);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async createItem(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const data = await InventoryService.createItem(tenantId, req.body);
      await AuditService.log({ eventType: 'inventory.product.created' as any, reference: `INV-${data.id}`, tenantId, payload: { id: data.id } });
      return res.status(201).json(data);
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
      const tenantId = (req as any).user?.tenantId;
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
      const tenantId = (req as any).user?.tenantId;
      const data = await InventoryService.updateItem(tenantId, req.params.id, req.body);
      await AuditService.log({ eventType: 'inventory.product.updated' as any, reference: `INV-${data.id}`, tenantId, payload: { id: data.id } });
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async archiveItem(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      await InventoryService.archiveItem(tenantId, req.params.id);
      await AuditService.log({ eventType: 'inventory.product.archived' as any, reference: `INV-${req.params.id}`, tenantId, payload: { id: req.params.id } });
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ==========================================
  // STOCK
  // ==========================================
  static async getLowStock(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const data = await InventoryService.getLowStock(tenantId);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getOutOfStock(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const data = await InventoryService.getOutOfStock(tenantId);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getStockSummary(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const data = await InventoryService.getStockSummary(tenantId);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getStockHistory(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
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
      const tenantId = (req as any).user?.tenantId;
      const data = await InventoryService.getCategories(tenantId);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ==========================================
  // SUPPLIERS
  // ==========================================
  static async getSuppliers(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const data = await InventoryService.getSuppliers(tenantId);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async createSupplier(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
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
      const tenantId = (req as any).user?.tenantId;
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
