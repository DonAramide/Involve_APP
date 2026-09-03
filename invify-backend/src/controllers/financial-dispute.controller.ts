import { Request, Response } from 'express';
import { DisputePolicyError } from '../services/financial-dispute.policy';
import { FinancialDisputeService } from '../services/financial-dispute.service';

function actorFrom(req: Request) {
  const user = (req as any).user || {};
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';
  return {
    id: String(user.id || user.sub || '').trim(),
    email: String(user.email || '').trim(),
    name: user.name || user.email?.split('@')[0] || 'Admin',
    ip,
  };
}

function sendError(res: Response, error: any) {
  const status = error?.status || (error instanceof DisputePolicyError ? error.status : 500);
  console.error('[FinancialDisputeController]', error.message);
  return res.status(status).json({
    error: error.message,
    case: error.case || undefined,
  });
}

export class FinancialDisputeController {
  static async create(req: Request, res: Response) {
    try {
      const idempotencyKey =
        (req.headers['idempotency-key'] as string) ||
        (req.headers['x-idempotency-key'] as string) ||
        req.body?.idempotencyKey;
      const result = await FinancialDisputeService.create(
        {
          tenantId: req.body.tenantId || req.body.tenant_id,
          tenantName: req.body.tenantName || req.body.tenant_name,
          caseType: req.body.caseType || req.body.case_type || req.body.type,
          amountKobo: req.body.amountKobo ?? req.body.amount_kobo,
          amountNaira: req.body.amountNaira ?? req.body.amount_naira,
          amount: req.body.amount,
          currency: req.body.currency,
          reason: req.body.reason,
          originalPaymentReference:
            req.body.originalPaymentReference || req.body.original_payment_reference,
          idempotencyKey,
        },
        actorFrom(req),
      );
      return res.status(result.idempotentReplay ? 200 : 201).json(result);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const rows = await FinancialDisputeService.list({
        status: req.query.status as string,
        tenantId: (req.query.tenantId || req.query.tenant_id) as string,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      return res.status(200).json({ data: rows });
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const row = await FinancialDisputeService.getById(req.params.id);
      return res.status(200).json(row);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  static async audit(req: Request, res: Response) {
    try {
      const events = await FinancialDisputeService.listEvents(req.params.id);
      return res.status(200).json({ data: events });
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      const result = await FinancialDisputeService.approve(
        req.params.id,
        actorFrom(req),
        req.body?.comment,
      );
      return res.status(200).json(result);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const result = await FinancialDisputeService.reject(
        req.params.id,
        actorFrom(req),
        req.body?.reason || req.body?.comment,
      );
      return res.status(200).json(result);
    } catch (error: any) {
      return sendError(res, error);
    }
  }
}
