import { Request, Response } from 'express';
import { resolveAuthoritativeTenantId } from '../utils/finance-tenant';
import { FinancialCommandService } from '../services/financial-command.service';
import { FeatureGateService } from '../config/build-variant';
import { isLiveFeePostingAllowed } from '../services/fee-live-gate';

function tenantFromRequest(req: Request, res: Response): string | null {
  try {
    return resolveAuthoritativeTenantId(req);
  } catch (err: any) {
    res.status(err?.status || 403).json({
      ack: 'rejected',
      message: err?.message || 'Forbidden: Cross-tenant access denied',
    });
    return null;
  }
}

function commandIdOf(req: Request): string {
  return String(req.headers['x-idempotency-key'] || req.body?.commandId || req.body?.idempotencyKey || '').trim();
}

export class FinancialCommandController {
  static async parentFund(req: Request, res: Response) {
    const tenantId = tenantFromRequest(req, res);
    if (!tenantId) return;
    try {
      const result = await FinancialCommandService.parentFund({
        tenantId,
        commandId: commandIdOf(req),
        amount: req.body?.amount,
        method: req.body?.method || req.body?.paymentMethod,
        parentId: req.body?.parentId,
        providerReference: req.body?.providerReference,
        confirmed: req.body?.confirmed === true,
      });
      const status = result.ack === 'rejected' ? 400 : 200;
      return res.status(status).json(result);
    } catch (err: any) {
      return res.status(err.status || 500).json({ ack: 'rejected', message: err.message });
    }
  }

  static async parentAllocate(req: Request, res: Response) {
    const tenantId = tenantFromRequest(req, res);
    if (!tenantId) return;
    try {
      const result = await FinancialCommandService.parentAllocate({
        tenantId,
        commandId: commandIdOf(req),
        amount: req.body?.amount,
        invoiceNumber: req.body?.invoiceNumber,
        reference: req.body?.reference,
        paymentMethod: req.body?.paymentMethod || 'Parent Credit',
        payload: req.body,
      });
      const status = result.ack === 'rejected' ? 400 : 200;
      return res.status(status).json(result);
    } catch (err: any) {
      return res.status(err.status || 500).json({ ack: 'rejected', message: err.message });
    }
  }

  static gates(_req: Request, res: Response) {
    return res.status(200).json({
      FEATURE_REAL_MONEY_PAYOUTS: process.env.FEATURE_REAL_MONEY_PAYOUTS === 'true',
      FEE_ORCHESTRATION_LIVE: process.env.FEE_ORCHESTRATION_LIVE === 'true',
      liveFeePostingAllowed: isLiveFeePostingAllowed(),
      realMoneyPayoutsEnabled: FeatureGateService.isFeatureEnabled('real_money_payouts'),
    });
  }
}
