import { Request, Response } from 'express';
import { platformFeeProfilesService } from '../services/platform-fee-profiles.service';

function sendError(res: Response, err: any) {
  const status = Number(err?.status) || 500;
  return res.status(status).json({
    error: err?.message || 'Platform fee profile request failed',
    blockers: err?.blockers,
  });
}

function actor(req: Request) {
  const user = (req as any).user || {};
  return {
    id: String(user.id || user.sub || ''),
    email: String(user.email || ''),
  };
}

function agentIdFrom(req: Request) {
  return String(req.query.agentId || req.query.agent_id || req.body?.agentId || req.body?.agent_id || '') || null;
}

export class PlatformFeeProfilesController {
  static async listAgents(_req: Request, res: Response) {
    try {
      const data = await platformFeeProfilesService.listAgents();
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const data = await platformFeeProfilesService.listProfiles();
      return res.json({ data, agents: await platformFeeProfilesService.listAgents().catch(() => []) });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const data = await platformFeeProfilesService.getProfile(String(req.params.transactionType || ''), agentIdFrom(req));
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async saveDraft(req: Request, res: Response) {
    try {
      const data = await platformFeeProfilesService.saveDraft(
        String(req.params.transactionType || ''),
        { ...(req.body || {}), agentId: agentIdFrom(req) },
      );
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async propose(req: Request, res: Response) {
    try {
      const data = await platformFeeProfilesService.proposePublish(
        String(req.params.transactionType || ''),
        actor(req),
        agentIdFrom(req),
        req.body,
      );
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const data = await platformFeeProfilesService.rejectPublish(
        String(req.params.transactionType || ''),
        actor(req),
        agentIdFrom(req),
      );
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async publish(req: Request, res: Response) {
    try {
      const data = await platformFeeProfilesService.publish(
        String(req.params.transactionType || ''),
        actor(req),
        agentIdFrom(req),
        req.body?.versionId || req.body?.version_id || null,
      );
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async preview(req: Request, res: Response) {
    try {
      const data = await platformFeeProfilesService.preview(
        String(req.params.transactionType || ''),
        { ...(req.body || {}), agentId: agentIdFrom(req) },
      );
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }
}
