// invify-backend/src/modules/financial-platform/audit/FinancialPlatformAuditController.ts

import { Request, Response } from 'express';
import { FinancialPlatformAuditService } from './FinancialPlatformAuditService';
import { ObservabilityContext } from '../domain/Types';
import { v4 as uuidv4 } from 'uuid';

export class FinancialPlatformAuditController {
  constructor(private auditService: FinancialPlatformAuditService) {}

  /**
   * GET /api/v1/tenants/:id/financial-platform/audit
   */
  async getAuditLog(req: Request, res: Response) {
    try {
      const tenantId = req.params.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const context: ObservabilityContext = {
        correlationId: req.headers['x-correlation-id'] as string || uuidv4(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        traceId: req.headers['x-trace-id'] as string || uuidv4(),
        auditId: uuidv4(),
        actorId: (req as any).user?.id || 'system',
        tenantId: tenantId
      };

      const history = await this.auditService.getAuditHistory(tenantId, context, limit);
      
      return res.status(200).json(history);
    } catch (error: any) {
      console.error('Audit Fetch Error:', error);
      return res.status(500).json({ error: 'Failed to fetch audit history', details: error.message });
    }
  }
}
