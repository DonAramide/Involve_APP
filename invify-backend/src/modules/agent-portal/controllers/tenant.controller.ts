import { Request, Response } from 'express';
import { tenantService } from '../services/tenant.service';
import { activationService } from '../services/activation.service';
import { supabaseAdmin } from '../../../db/supabase';
import { loadAttributedTenantIds } from '../services/agent-fee-read-model';

async function resolveInstituteAgent(req: Request) {
  const authUser = (req as any).user || {};
  const authUserId = authUser.id;
  if (!authUserId) return null;

  let { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id, agent_code')
    .eq('auth_user_id', authUserId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!agent && authUser.agentId) {
    const byId = await supabaseAdmin
      .from('agents')
      .select('id, agent_code')
      .eq('id', authUser.agentId)
      .is('deleted_at', null)
      .maybeSingle();
    agent = byId.data;
  }
  if (!agent && authUser.email) {
    const byEmail = await supabaseAdmin
      .from('agents')
      .select('id, agent_code')
      .ilike('email', String(authUser.email).trim())
      .is('deleted_at', null)
      .maybeSingle();
    agent = byEmail.data;
  }
  return agent;
}

function progressStage(row: any): string {
  const nested = row?.tenant_activation_progress;
  const progress = Array.isArray(nested) ? nested[0] : nested;
  return String(progress?.current_stage || row.activation_status || row.current_stage || 'REGISTRATION');
}

export class TenantController {
  static async updateActivation(req: Request, res: Response) {
    try {
      const data = await tenantService.updateActivation(req.params.id, req.body.stage, (req as any).user?.id || 'sys');
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(Number(err.status) || 500).json({ success: false, message: err.message });
    }
  }

  static async advance(req: Request, res: Response) {
    try {
      const agent = await resolveInstituteAgent(req);
      if (!agent) return res.status(401).json({ success: false, message: 'Institute profile not found' });
      const link = await activationService.resolveOwnedLink(String(req.params.id || ''), agent.id);
      const data = await activationService.advanceToNext(link.id);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(Number(err.status) || 500).json({ success: false, message: err.message || 'Failed to advance stage' });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const agent = await resolveInstituteAgent(req);
      if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

      const attributed = await loadAttributedTenantIds(agent.id, String(agent.agent_code || ''));
      const linked = await tenantService.getTenantsByAgent(agent.id);
      const byId = new Map<string, any>();
      for (const row of [...(linked || []), ...attributed.attributedTenants]) {
        const key = String(row.tenant_id || row.id);
        if (!key) continue;
        byId.set(key, {
          ...row,
          tenant_id: row.tenant_id || row.id,
          agent_code: row.agent_code || agent.agent_code,
          activation_status: progressStage(row),
        });
      }
      res.status(200).json({ success: true, data: [...byId.values()] });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async listAll(req: Request, res: Response) {
    try {
      const tenants = await tenantService.getAllTenants();
      res.status(200).json({ success: true, data: tenants });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}
