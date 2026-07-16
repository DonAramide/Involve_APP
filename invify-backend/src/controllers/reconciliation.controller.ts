// src/controllers/reconciliation.controller.ts
import { Request, Response } from 'express';
import { ReconciliationService } from '../services/reconciliation.service';

export class ReconciliationController {
  
  static async getReport(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    const { status, cursor, limit } = req.query;

    // tenantId defaults to global

    try {
      const report = await ReconciliationService.getReport({
        tenantId,
        status: status as any,
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string) : 50
      });
      return res.status(200).json(report);
    } catch (error: any) {
      console.error('[ReconciliationController] Error:', error.message);
      return res.status(500).json({ error: 'Failed to generate reconciliation report' });
    }
  }

  // ==== Detail Tabs ====
  static async getDetails(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const result = await ReconciliationService.getDetails(req.params.id, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getLedger(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const result = await ReconciliationService.getLedger(req.params.id, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getSettlement(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const result = await ReconciliationService.getSettlement(req.params.id, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getWallet(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const result = await ReconciliationService.getWallet(req.params.id, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getCard(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const result = await ReconciliationService.getCard(req.params.id, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getBank(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const result = await ReconciliationService.getBank(req.params.id, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getAudit(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const result = await ReconciliationService.getAudit(req.params.id, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getTimeline(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const result = await ReconciliationService.getTimeline(req.params.id, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ==== Commands ====
  static async assign(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const user = (req as any).user;
      const result = await ReconciliationService.executeCommand(req.params.id, 'ASSIGN', req.body, user, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async escalate(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const user = (req as any).user;
      const result = await ReconciliationService.executeCommand(req.params.id, 'ESCALATE', req.body, user, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async resolve(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const user = (req as any).user;
      const result = await ReconciliationService.executeCommand(req.params.id, 'RESOLVE', req.body, user, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async forceMatch(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const user = (req as any).user;
      const result = await ReconciliationService.executeCommand(req.params.id, 'FORCE_MATCH', req.body, user, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async retry(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const user = (req as any).user;
      const result = await ReconciliationService.executeCommand(req.params.id, 'RETRY', req.body, user, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async lock(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const user = (req as any).user;
      const result = await ReconciliationService.executeCommand(req.params.id, 'LOCK', req.body, user, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async unlock(req: Request, res: Response) {
    const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';
    // tenantId defaults to global
    try {
      const user = (req as any).user;
      const result = await ReconciliationService.executeCommand(req.params.id, 'UNLOCK', req.body, user, tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
