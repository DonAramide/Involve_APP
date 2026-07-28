// invify-backend/src/modules/financial-platform/activation/FinancialPlatformActivationController.ts

import { Request, Response } from 'express';
import { FinancialPlatformActivationService } from './FinancialPlatformActivationService';
import { ObservabilityContext } from '../domain/Types';
import { v4 as uuidv4 } from 'uuid';

export class FinancialPlatformActivationController {
  constructor(
    private activationService: FinancialPlatformActivationService
  ) {}

  /**
   * POST /api/v1/tenants/:id/financial-platform/activate
   */
  async activate(req: Request, res: Response) {
    try {
      const tenantId = req.params.id;
      
      // Extract or generate Observability Context
      const context: ObservabilityContext = {
        correlationId: req.headers['x-correlation-id'] as string || uuidv4(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        traceId: req.headers['x-trace-id'] as string || uuidv4(),
        auditId: uuidv4(),
        actorId: (req as any).user?.id || 'system',
        tenantId: tenantId
      };

      const result = await this.activationService.activateTenant(tenantId, context);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Activation Error:', error);
      
      if (error.message.includes('already in progress') || error.message.includes('already activated')) {
        return res.status(409).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Failed to activate financial platform', details: error.message });
    }
  }
}
