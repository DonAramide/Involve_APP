// invify-backend/src/modules/financial-platform/health/FinancialPlatformHealthController.ts

import { Request, Response } from 'express';
import { FinancialPlatformHealthService } from './FinancialPlatformHealthService';
import { ObservabilityContext } from '../domain/Types';
import { v4 as uuidv4 } from 'uuid';

export class FinancialPlatformHealthController {
  constructor(private healthService: FinancialPlatformHealthService) {}

  /**
   * GET /api/v1/tenants/:id/financial-platform/health
   */
  async getHealth(req: Request, res: Response) {
    try {
      const tenantId = req.params.id;
      
      const context: ObservabilityContext = {
        correlationId: req.headers['x-correlation-id'] as string || uuidv4(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        traceId: req.headers['x-trace-id'] as string || uuidv4(),
        auditId: uuidv4(),
        actorId: (req as any).user?.id || 'system',
        tenantId: tenantId
      };

      const diagnostics = await this.healthService.getDiagnostics(tenantId, context);
      
      return res.status(200).json(diagnostics);
    } catch (error: any) {
      console.error('Health Check Error:', error);
      return res.status(500).json({ error: 'Failed to run diagnostics', details: error.message });
    }
  }
}
