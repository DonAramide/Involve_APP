import { Request, Response } from 'express';
import { tenantService } from '../services/tenant.service';
import { supabase } from '../../../db/supabase';

export class TenantController {
  static async updateActivation(req: Request, res: Response) {
    try {
      const data = await tenantService.updateActivation(req.params.id, req.body.stage, (req as any).user?.id || 'sys');
      res.status(200).json({ success: true, data });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }

  static async list(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
      if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

      const tenants = await tenantService.getTenantsByAgent(agent.id);
      res.status(200).json({ success: true, data: tenants });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }

  static async listAll(req: Request, res: Response) {
    try {
      const tenants = await tenantService.getAllTenants();
      res.status(200).json({ success: true, data: tenants });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}
