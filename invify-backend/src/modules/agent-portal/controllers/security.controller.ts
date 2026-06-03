import { Request, Response } from 'express';
import { supabase } from '../../../db/supabase';

export class SecurityController {
  static async changePassword(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { new_password } = req.body;
      
      const { error } = await supabase.auth.admin.updateUserById(authUserId, { password: new_password });
      if (error) throw error;

      res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async enableMfa(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
      if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

      // In real prod, this generates TOTP secret. We simulate for MVP:
      await supabase.from('agent_profiles').update({ mfa_enabled: true, mfa_secret: 'SIMULATED_SECRET' }).eq('agent_id', agent.id);
      
      await supabase.from('agent_security_events').insert({
        agent_id: agent.id,
        event_type: 'MFA_ENABLED',
        ip_address: req.ip || '',
        browser: req.headers['user-agent'] || ''
      });

      res.status(200).json({ success: true, message: 'MFA enabled' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async disableMfa(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
      if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

      await supabase.from('agent_profiles').update({ mfa_enabled: false, mfa_secret: null }).eq('agent_id', agent.id);

      await supabase.from('agent_security_events').insert({
        agent_id: agent.id,
        event_type: 'MFA_DISABLED',
        ip_address: req.ip || '',
        browser: req.headers['user-agent'] || ''
      });

      res.status(200).json({ success: true, message: 'MFA disabled' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getSessions(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
      if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

      const { data, error } = await supabase.from('agent_sessions').select('*').eq('agent_id', agent.id);
      
      // Also grab login history
      const { data: history } = await supabase.from('agent_security_events').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false }).limit(10);

      res.status(200).json({ success: true, data: { sessions: data || [], history: history || [] } });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async revokeSession(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { id } = req.params;
      await supabase.from('agent_sessions').delete().eq('id', id);

      res.status(200).json({ success: true, message: 'Session revoked' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
