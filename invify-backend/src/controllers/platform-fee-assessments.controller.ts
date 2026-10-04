import { Request, Response } from 'express';
import { platformFeeAssessmentsService } from '../services/platform-fee-assessments.service';

function sendError(res: Response, err: any) {
  const status = Number(err?.status) || 500;
  return res.status(status).json({
    error: err?.message || 'Platform fee assessment request failed',
  });
}

export class PlatformFeeAssessmentsController {
  static async list(req: Request, res: Response) {
    try {
      const data = await platformFeeAssessmentsService.list({
        transactionType: String(req.query.transaction_type || req.query.transactionType || ''),
        mode: String(req.query.mode || ''),
        kind: String(req.query.kind || ''),
        sourceSystem: String(req.query.source_system || req.query.sourceSystem || ''),
        sourceIdempotencyKey: String(req.query.source_idempotency_key || req.query.idempotency_key || ''),
        reference: String(req.query.reference || req.query.source || ''),
        from: String(req.query.from || ''),
        to: String(req.query.to || ''),
        limit: Number(req.query.limit || 100),
        agentId: String(req.query.agentId || req.query.agent_id || ''),
        tenantId: String(req.query.tenantId || req.query.tenant_id || ''),
      });
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const data = await platformFeeAssessmentsService.get(String(req.params.assessmentId || ''));
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async reconciliation(req: Request, res: Response) {
    try {
      const data = await platformFeeAssessmentsService.reconciliation({
        transactionType: String(req.query.transaction_type || ''),
        mode: String(req.query.mode || ''),
        kind: String(req.query.kind || ''),
        sourceSystem: String(req.query.source_system || ''),
        from: String(req.query.from || ''),
        to: String(req.query.to || ''),
      });
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }
}
