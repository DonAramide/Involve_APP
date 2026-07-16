import { Request, Response } from 'express';
import { InvoiceFacade } from '../facades/invoice.facade';
import { randomUUID } from 'crypto';

export class InvoiceController {
  static async createInvoice(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'];
      const deviceId = (req.headers['x-device-id'] as string) || 'dashboard';
      const correlationId = (req as any).correlationId || req.headers['x-correlation-id'] || randomUUID();
      const idempotencyKey = req.headers['x-idempotency-key'] as string || randomUUID();
      
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Tenant ID required' });
      }

      // Generate a syncId for the dashboard request if it doesn't have one (so logic matches Flutter)
      const payload = {
        ...req.body,
        syncId: req.body.syncId || randomUUID(),
        dateCreated: req.body.dateCreated || new Date().toISOString()
      };

      const result = await InvoiceFacade.createInvoice(
        payload,
        { tenantId, deviceId },
        idempotencyKey,
        correlationId
      );

      return res.status(201).json(result);
    } catch (err: any) {
      console.error(`[InvoiceController.createInvoice] Error: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getInvoices(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'];
      if (!tenantId) return res.status(401).json({ success: false, message: 'Tenant ID required' });
      
      const filters = req.query;
      const data = await InvoiceFacade.getInvoices(tenantId, filters);
      
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getInvoice(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'];
      if (!tenantId) return res.status(401).json({ success: false, message: 'Tenant ID required' });
      
      const { id } = req.params;
      const data = await InvoiceFacade.getInvoice(tenantId, id);
      
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async recordPayment(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'];
      if (!tenantId) return res.status(401).json({ success: false, message: 'Tenant ID required' });
      
      const { id } = req.params;
      const user = (req as any).user || {};
      const payload = {
        ...req.body,
        userEmail: user.email,
        userName: user.name,
        ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress
      };
      
      const data = await InvoiceFacade.recordPayment(tenantId, id, payload);
      
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getTimeline(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'];
      if (!tenantId) return res.status(401).json({ success: false, message: 'Tenant ID required' });
      
      const { id } = req.params;
      const data = await InvoiceFacade.getTimeline(tenantId, id);
      
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
