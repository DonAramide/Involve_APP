// invify-backend/src/modules/financial-platform/activation/FinancialPlatformRotationController.ts

import { Request, Response } from 'express';
import { FinancialPlatformRotationService } from './FinancialPlatformRotationService';
import { ObservabilityContext } from '../domain/Types';
import { v4 as uuidv4 } from 'uuid';

export class FinancialPlatformRotationController {
  constructor(private rotationService: FinancialPlatformRotationService) {}

  /**
   * POST /api/v1/tenants/:id/financial-platform/rotate
   */
  async rotate(req: Request, res: Response) {
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

      const result = await this.rotationService.rotateCredentials(tenantId, context);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Rotation Error:', error);
      
      if (error.message.includes('already in progress') || error.message.includes('must be ACTIVE')) {
        return res.status(409).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Failed to rotate credentials', details: error.message });
    }
  }
}
