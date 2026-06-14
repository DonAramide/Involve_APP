import { Request, Response } from 'express';
import { leadService } from '../services/lead.service';
import { supabase } from '../../../db/supabase';
import { integrationEngine } from '../../../services/integration-engine.service';

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

  static async convert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const authUserId = (req as any).user?.id;
      if (!authUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      // Check if we are in mock/offline mode
      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        return res.status(200).json({
          success: true,
          message: 'Lead converted successfully (Mock Mode)',
          data: {
            tenant_id: `tenant-${require('crypto').randomUUID()}`,
            agent_tenant_id: `agent-tenant-${require('crypto').randomUUID()}`
          }
        });
      }

      // Fetch Agent
      const { data: agent, error: agentErr } = await supabase
        .from('agents')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single();
      if (agentErr || !agent) return res.status(404).json({ success: false, message: 'Agent not found' });

      // Fetch Lead
      const { data: lead, error: leadErr } = await supabase
        .from('agent_leads')
        .select('*')
        .eq('id', id)
        .single();
      if (leadErr || !lead) return res.status(404).json({ success: false, message: 'Lead not found' });

      // 1. Create a tenant
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({
          name: lead.business_name,
          type: 'merchant',
          plan: 'standard',
          status: 'active'
        })
        .select()
        .single();
      if (tenantErr) throw tenantErr;

      // 2. Create tenant wallet
      const { error: walletErr } = await supabase
        .from('wallets')
        .insert({ tenant_id: tenant.id, balance: 0 });
      if (walletErr) console.error('[LeadConvert] Wallet creation error:', walletErr.message);

      // Try virtual account creation using Quasar SDK
      try {
        const platformApiKey = process.env.QUASER_API_KEY || 'demo-key';
        const QuasarServiceModule = require('../../../integrations/quasar/quasar.service').QuasarService;
        const quasar = new QuasarServiceModule(platformApiKey);
        const platformId = 'platform-admin-owner-id';
        
        const va = await quasar.createVirtualAccount({
          childId: tenant.id,
          parentId: platformId,
          currency: 'NGN',
          email: lead.email || `billing@tenant-${tenant.id.substring(0,8)}.invify.app`,
          firstName: lead.contact_person ? lead.contact_person.split(' ')[0] : 'Owner',
          lastName: lead.contact_person ? (lead.contact_person.split(' ').slice(1).join(' ') || 'Merchant') : 'Merchant',
          parentShareBps: 0,
          metadata: { type: 'tenant_operating_account' }
        });
        
        await supabase
          .from('tenants')
          .update({
            virtual_account_number: va.accountNumber,
            virtual_account_bank: va.bankName,
            virtual_account_status: 'ACTIVE'
          })
          .eq('id', tenant.id);
      } catch (vaErr: any) {
        console.error('[LeadConvert] Quasar virtual account failed (non-blocking):', vaErr.message);
      }

      // 3. Link in agent_tenants table
      const onboardingDate = new Date().toISOString().split('T')[0];
      const { data: agentTenant, error: agentTenantErr } = await supabase
        .from('agent_tenants')
        .insert({
          agent_id: agent.id,
          tenant_id: tenant.id,
          business_name: lead.business_name,
          owner_name: lead.contact_person,
          contact_email: lead.email,
          contact_phone: lead.phone,
          status: 'ONBOARDING',
          onboarding_date: onboardingDate
        })
        .select()
        .single();
      if (agentTenantErr) throw agentTenantErr;

      // 4. Create activation progress record
      const { error: progressErr } = await supabase
        .from('tenant_activation_progress')
        .insert({
          agent_tenant_id: agentTenant.id,
          current_stage: 'REGISTRATION',
          completion_percentage: 10.00,
          is_registration_complete: true,
          is_kyc_pending: false,
          is_kyc_approved: false,
          is_terminal_assigned: false,
          is_terminal_deployed: false,
          is_training_completed: false,
          is_first_transaction: false,
          is_fully_activated: false
        });
      if (progressErr) console.error('[LeadConvert] Progress record creation error:', progressErr.message);

      // 5. Update lead status and link in agent_leads
      const { error: updateLeadErr } = await supabase
        .from('agent_leads')
        .update({
          status: 'converted',
          converted_tenant_id: tenant.id
        })
        .eq('id', id);
      if (updateLeadErr) console.error('[LeadConvert] Lead update error:', updateLeadErr.message);

      try {
        await integrationEngine.publish('LEAD_CONVERTED', 'LEAD_MANAGEMENT', id, {
          agentId: agent.id,
          tenantId: tenant.id,
          leadId: id
        });
      } catch (err) {
        console.error('[LeadConvert] Failed to publish LEAD_CONVERTED:', err);
      }

      // 6. Log audit event
      try {
        const { agentRepository } = require('../repositories/agent.repository');
        await agentRepository.logAudit(
          agent.id,
          'LEAD',
          id,
          'CONVERT',
          lead.status,
          { converted_tenant_id: tenant.id, status: 'converted' },
          req.ip || '',
          (req.headers['user-agent'] as string) || ''
        );
      } catch (auditErr: any) {
        console.error('[LeadConvert] Logging audit failed:', auditErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Lead converted to tenant successfully',
        data: {
          tenant_id: tenant.id,
          agent_tenant_id: agentTenant.id
        }
      });

    } catch (err: any) {
      console.error('[LeadConvert] Error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
