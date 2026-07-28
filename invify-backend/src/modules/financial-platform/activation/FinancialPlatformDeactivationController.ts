import { Request, Response } from 'express';
import { FinancialPlatformDeactivationService } from './FinancialPlatformDeactivationService';
import { ObservabilityContext } from '../domain/Types';
import { v4 as uuidv4 } from 'uuid';

export class FinancialPlatformDeactivationController {
  constructor(private deactivationService: FinancialPlatformDeactivationService) {}

  async deactivate(req: Request, res: Response) {
    try {
      const tenantId = req.params.id;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Reason for deactivation is required' });
      }

      const context: ObservabilityContext = {
        correlationId: req.headers['x-correlation-id'] as string || uuidv4(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        traceId: req.headers['x-trace-id'] as string || uuidv4(),
        auditId: uuidv4(),
        actorId: (req as any).user?.id || 'system',
        tenantId: tenantId
      };

      const result = await this.deactivationService.deactivateTenant(tenantId, reason, context);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Deactivation Error:', error);
      if (error.message.includes('already in progress') || error.message.includes('not active') || error.message.includes('Critical financial operations')) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to deactivate financial platform', details: error.message });
    }
  }
}
