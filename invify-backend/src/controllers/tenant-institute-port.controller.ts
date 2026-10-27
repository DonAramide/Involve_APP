import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { tenantInstitutePortService } from '../services/tenant-institute-port.service';

function actor(req: Request) {
  const user = (req as any).user || {};
  return {
    id: String(user.id || user.sub || ''),
    email: String(user.email || ''),
    name: user.name || user.email?.split('@')[0] || 'Admin',
  };
}

function clientIp(req: Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

async function audit(req: Request, action: string, status: 'success' | 'failed' | 'pending' | 'approved' | 'rejected', metadata: Record<string, any>) {
  try {
    const { GovAuditService } = require('../services/gov-audit.service');
    const user = actor(req);
    await GovAuditService.logAction({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      module: 'MAKER_CHECKER',
      action,
      user_email: user.email || 'unknown',
      user_name: user.name,
      ip_address: clientIp(req),
      target: String(req.params.id || ''),
      status,
      tenant_id: String(req.params.id || ''),
      metadata,
    });
  } catch (err) {
    console.warn('[TenantInstitutePort] audit failed:', (err as Error).message);
  }
}

function sendError(res: Response, err: any) {
  const status = Number(err?.status) || 500;
  return res.status(status).json({ error: err?.message || 'Institute port failed' });
}

export class TenantInstitutePortController {
  static async get(req: Request, res: Response) {
    try {
      const data = await tenantInstitutePortService.getSnapshot(String(req.params.id));
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async propose(req: Request, res: Response) {
    try {
      const user = actor(req);
      const data = await tenantInstitutePortService.propose({
        tenantId: String(req.params.id),
        actorId: user.id,
        actorEmail: user.email,
        toAgentId: req.body?.toAgentId ?? req.body?.to_agent_id ?? req.body?.instituteId,
        reason: req.body?.reason,
      });
      await audit(req, 'INSTITUTE_PORT_PROPOSED', 'pending', {
        from: data.proposal?.from,
        to: data.proposal?.to,
      });
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      const user = actor(req);
      const data = await tenantInstitutePortService.approve({
        tenantId: String(req.params.id),
        actorId: user.id,
        actorEmail: user.email,
      });
      await audit(req, 'INSTITUTE_PORT_APPROVED', 'approved', {
        from: data.proposal?.from,
        to: data.proposal?.to,
        current: data.current,
      });
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const user = actor(req);
      const data = await tenantInstitutePortService.reject({
        tenantId: String(req.params.id),
        actorId: user.id,
        actorEmail: user.email,
        reason: req.body?.reason,
      });
      await audit(req, 'INSTITUTE_PORT_REJECTED', 'rejected', {
        from: data.proposal?.from,
        to: data.proposal?.to,
      });
      return res.json({ data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }
}
