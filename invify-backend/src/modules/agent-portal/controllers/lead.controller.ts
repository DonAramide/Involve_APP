import { Request, Response } from 'express';
import { leadService } from '../services/lead.service';
import { supabase } from '../../../db/supabase';

export class LeadController {
  static async create(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
      if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

      const l = await leadService.createLead(req.body, agent.id, req.ip || '', (req.headers['user-agent'] as string) || '');
      res.status(201).json({ success: true, data: l });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }

  static async list(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
      if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

      const leads = await leadService.getLeadsByAgent(agent.id);
      res.status(200).json({ success: true, data: leads });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }

  static async listAll(req: Request, res: Response) {
    try {
      const leads = await leadService.getAllLeads();
      res.status(200).json({ success: true, data: leads });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}