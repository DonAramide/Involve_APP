// invify-backend/src/modules/financial-platform/activation/FinancialPlatformChangeVerticalController.ts

import { Request, Response } from 'express';
import { FinancialPlatformChangeVerticalService } from './FinancialPlatformChangeVerticalService';
import { ObservabilityContext } from '../domain/Types';
import { v4 as uuidv4 } from 'uuid';

export class FinancialPlatformChangeVerticalController {
  constructor(private changeVerticalService: FinancialPlatformChangeVerticalService) {}

  /**
   * POST /api/v1/tenants/:id/financial-platform/change-vertical
   * Body: { type: 'school'|'retail'|'services', confirmPhrase: 'CHANGE VERTICAL', reason?: string }
   */
  async changeVertical(req: Request, res: Response) {
    try {
      const tenantId = req.params.id;
      const { type, confirmPhrase, reason } = req.body || {};

      if (!type) {
        return res.status(400).json({ error: 'type is required (school | retail | services)' });
      }

      const context: ObservabilityContext = {
        correlationId: (req.headers['x-correlation-id'] as string) || uuidv4(),
        requestId: (req.headers['x-request-id'] as string) || uuidv4(),
        traceId: (req.headers['x-trace-id'] as string) || uuidv4(),
        auditId: uuidv4(),
        actorId: (req as any).user?.id || 'system',
        tenantId,
      };

      const result = await this.changeVerticalService.changeVertical(
        tenantId,
        type,
        confirmPhrase,
        reason,
        context,
      );

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Change Vertical Error:', error);
      const status = error.statusCode || (error.message?.includes('already in progress') ? 409 : 500);
      return res.status(status).json({
        error: error.message || 'Failed to change tenant vertical',
        details: error.message,
      });
    }
  }
}
