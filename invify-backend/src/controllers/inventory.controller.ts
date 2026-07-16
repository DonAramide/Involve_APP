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
}
