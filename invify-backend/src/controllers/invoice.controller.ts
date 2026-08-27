import { Request, Response } from 'express';
import { InvoiceFacade } from '../facades/invoice.facade';
import { randomUUID } from 'crypto';
import { resolveAuthoritativeTenantId } from '../utils/finance-tenant';

function tenantFromRequest(req: Request, res: Response): string | null {
  try {
    return resolveAuthoritativeTenantId(req);
  } catch (err: any) {
    res.status(err?.status || 403).json({
      success: false,
      message: err?.message || 'Forbidden: Cross-tenant access denied',
    });
    return null;
  }
}

export class InvoiceController {
  static async createInvoice(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
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

  static async bulkSyncInvoices(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      const deviceId = (req.headers['x-device-id'] as string) || 'dashboard';
      const { invoices } = req.body as { invoices: any[] };

      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Tenant ID required' });
      }
      if (!Array.isArray(invoices) || invoices.length === 0) {
        return res.status(400).json({ success: false, message: 'invoices array is required and must not be empty.' });
      }

      let synced = 0;
      const errors: string[] = [];

      for (const invoice of invoices) {
        try {
          const idempotencyKey = invoice.idempotencyKey || invoice.syncId || randomUUID();
          const correlationId = invoice.correlationId || randomUUID();
          await InvoiceFacade.createInvoice(
            invoice,
            { tenantId, deviceId },
            idempotencyKey,
            correlationId
          );
          synced++;
        } catch (err: any) {
          console.error(`[InvoiceController.bulkSyncInvoices] Failed for invoice ${invoice.invoiceNumber || invoice.syncId}: ${err.message}`);
          errors.push(`${invoice.invoiceNumber || invoice.syncId}: ${err.message}`);
        }
      }

      return res.status(200).json({
        success: errors.length === 0,
        synced,
        errors
      });
    } catch (err: any) {
      console.error(`[InvoiceController.bulkSyncInvoices] Fatal: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getInvoices(req: Request, res: Response) {
    try {
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
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
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
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
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
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
      const tenantId = tenantFromRequest(req, res);
      if (!tenantId) return;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Tenant ID required' });
      
      const { id } = req.params;
      const data = await InvoiceFacade.getTimeline(tenantId, id);
      
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
