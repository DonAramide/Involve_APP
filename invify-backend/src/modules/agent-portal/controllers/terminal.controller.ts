import { Request, Response } from 'express';
import { supabase } from '../../../db/supabase';
import { activationService } from '../services/activation.service';

export class TerminalController {
  static async assign(req: Request, res: Response) {
    try {
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { agent_tenant_id, terminal_id, assigned_device_id } = req.body;

      if (!agent_tenant_id || !terminal_id || !assigned_device_id) {
        return res.status(400).json({ success: false, message: 'Missing required fields: agent_tenant_id, terminal_id, assigned_device_id' });
      }

      // 1. Fetch agent
      const { data: agent, error: agentErr } = await supabase
        .from('agents')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single();
      if (agentErr || !agent) return res.status(404).json({ success: false, message: 'Agent not found' });

      // 2. Fetch agent_tenant
      const { data: agentTenant, error: agentTenantErr } = await supabase
        .from('agent_tenants')
        .select('id, tenant_id')
        .eq('id', agent_tenant_id)
        .eq('agent_id', agent.id)
        .single();
      
      if (agentTenantErr || !agentTenant) {
        return res.status(404).json({ success: false, message: 'Agent tenant record not found' });
      }

      // 3. Fetch terminal
      const { data: terminal, error: terminalErr } = await supabase
        .from('terminal_inventory')
        .select('*')
        .eq('id', terminal_id)
        .single();

      if (terminalErr || !terminal) {
        return res.status(404).json({ success: false, message: 'Terminal not found in inventory' });
      }

      if (terminal.assignment_status === 'assigned') {
        return res.status(400).json({ success: false, message: 'Terminal is already assigned' });
      }

      // 4. Update terminal_inventory
      const { error: updateTermErr } = await supabase
        .from('terminal_inventory')
        .update({
          assigned_tenant_id: agentTenant.tenant_id,
          assigned_device_id: assigned_device_id,
          assignment_status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', terminal_id);

      if (updateTermErr) throw updateTermErr;

      // 5. Write to terminal_audit_log
      const { error: auditErr } = await supabase
        .from('terminal_audit_log')
        .insert({
          terminal_id: terminal_id,
          action: 'ASSIGNED',
          performed_by: agent.id,
          details: { assigned_to: agentTenant.tenant_id, assigned_device_id },
          created_at: new Date().toISOString()
        });

      if (auditErr) {
        console.error('Failed to write terminal audit log:', auditErr.message);
      }

      // 6. Transition state
      try {
        await activationService.advanceStage(agent_tenant_id, 'TERMINAL_ASSIGNED');
      } catch (actErr: any) {
        // Just log the error, don't fail the whole request since terminal is already assigned
        // In real system, maybe use transactions
        console.error('Failed to advance activation stage:', actErr.message);
      }

      return res.status(200).json({ success: true, message: 'Terminal assigned successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
