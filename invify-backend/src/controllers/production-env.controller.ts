import { Request, Response, NextFunction } from 'express';
import {
  APPLY_CONFIRM_PHRASE,
  isProductionEnvGovernor,
  productionEnvGovernance,
} from '../services/production-env-governance.service';
import { GovAuditService } from '../services/gov-audit.service';

function actor(req: Request) {
  const user = (req as any).user || {};
  return {
    id: String(user.id || ''),
    email: String(user.email || ''),
    role: user.role,
  };
}

function clientIp(req: Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || '127.0.0.1';
}

export function requireProductionEnvGovernor(req: Request, res: Response, next: NextFunction) {
  const user = actor(req);
  if (!isProductionEnvGovernor(user.email, user.role)) {
    return res.status(403).json({
      error: 'Production env is restricted to the designated super-admin governor.',
    });
  }
  return next();
}

export class ProductionEnvController {
  static getSnapshot(req: Request, res: Response) {
    try {
      return res.status(200).json({
        confirmPhrase: APPLY_CONFIRM_PHRASE,
        selfApproveAllowed: true,
        ...productionEnvGovernance.snapshot(),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to read production env' });
    }
  }

  static async propose(req: Request, res: Response) {
    try {
      const user = actor(req);
      const change = productionEnvGovernance.propose({
        key: req.body?.key,
        value: req.body?.value,
        reason: req.body?.reason,
        makerEmail: user.email,
        makerId: user.id,
      });
      await GovAuditService.logAction({
        id: change.id,
        timestamp: change.createdAt,
        module: 'MAKER_CHECKER',
        action: 'PRODUCTION_ENV_PROPOSE',
        user_email: user.email,
        user_name: user.email,
        ip_address: clientIp(req),
        target: change.key,
        status: 'pending',
        metadata: { from: change.fromPreview, to: change.toPreview, reason: req.body?.reason },
      });
      return res.status(200).json({ success: true, change });
    } catch (error: any) {
      return res.status(error.status || 500).json({ error: error.message || 'Propose failed' });
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      const user = actor(req);
      const change = productionEnvGovernance.approve(
        String(req.body?.id || ''),
        user.email,
        String(req.body?.confirmPhrase || ''),
      );
      await GovAuditService.logAction({
        id: change.id,
        timestamp: change.decidedAt || new Date().toISOString(),
        module: 'MAKER_CHECKER',
        action: 'PRODUCTION_ENV_APPROVE',
        user_email: user.email,
        user_name: user.email,
        ip_address: clientIp(req),
        target: change.key,
        status: 'approved',
        metadata: { to: change.toPreview },
      });
      return res.status(200).json({ success: true, change });
    } catch (error: any) {
      return res.status(error.status || 500).json({ error: error.message || 'Approve failed' });
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const user = actor(req);
      const change = productionEnvGovernance.reject(
        String(req.body?.id || ''),
        user.email,
        String(req.body?.reason || ''),
      );
      await GovAuditService.logAction({
        id: change.id,
        timestamp: change.decidedAt || new Date().toISOString(),
        module: 'MAKER_CHECKER',
        action: 'PRODUCTION_ENV_REJECT',
        user_email: user.email,
        user_name: user.email,
        ip_address: clientIp(req),
        target: change.key,
        status: 'rejected',
      });
      return res.status(200).json({ success: true, change });
    } catch (error: any) {
      return res.status(error.status || 500).json({ error: error.message || 'Reject failed' });
    }
  }
}
