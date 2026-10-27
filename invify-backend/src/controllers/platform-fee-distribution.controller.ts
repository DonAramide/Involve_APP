import { Request, Response } from 'express';
import { platformFeeDistributionService } from '../services/platform-fee-distribution.service';

function sendError(res: Response, err: any) {
  const status = Number(err?.status) || 500;
  return res.status(status).json({
    error: err?.message || 'Platform fee distribution request failed',
    code: err?.code,
  });
}

function actor(req: Request) {
  const user = (req as any).user || {};
  return {
    id: String(user.id || user.sub || ''),
    email: String(user.email || ''),
  };
}

export class PlatformFeeDistributionController {
  static async distribution(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.distribution({
        transactionType: String(req.query.transaction_type || req.query.transactionType || ''),
        from: String(req.query.from || ''),
        to: String(req.query.to || ''),
        agentId: String(req.query.agentId || req.query.agent_id || ''),
      });
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async agentCommission(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.agentCommission(String(req.query.agentId || req.query.agent_id || ''));
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async listStakeholders(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.listStakeholders(
        String(req.query.agentId || req.query.agent_id || ''),
      );
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async createStakeholder(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.createStakeholder(req.body || {}, actor(req));
      return res.status(201).json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async getStakeholder(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.getStakeholder(String(req.params.id || ''));
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async updateStakeholder(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.updateStakeholder(
        String(req.params.id || ''),
        req.body || {},
        actor(req),
      );
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async listPayables(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.listPayables(String(req.params.id || ''));
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async listSettlements(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.listSettlements(String(req.params.id || ''));
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async listWithdrawals(_req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.listWithdrawals();
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async getWithdrawal(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.getWithdrawal(String(req.params.withdrawalId || ''));
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async createWithdrawal(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.createWithdrawal(req.body || {}, actor(req));
      return res.status(201).json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async approveWithdrawal(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.approveWithdrawal(
        String(req.params.withdrawalId || ''),
        actor(req),
      );
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async rejectWithdrawal(req: Request, res: Response) {
    try {
      const data = await platformFeeDistributionService.rejectWithdrawal(
        String(req.params.withdrawalId || ''),
        String(req.body?.reason || 'Rejected'),
        actor(req),
      );
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async completeSettlement(_req: Request, res: Response) {
    try {
      platformFeeDistributionService.completeSettlement();
      return res.status(409).json({ error: 'Payout execution is disabled' });
    } catch (err: any) {
      return sendError(res, err);
    }
  }
}
