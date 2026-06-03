const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'src', 'modules', 'agent-portal');
const dirs = ['repositories', 'services', 'controllers', 'routes', 'tests'];

dirs.forEach(d => {
  const p = path.join(basePath, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const files = {
  // ================= LEADS CRM =================
  'repositories/lead.repository.ts': `import { supabase } from '../../../db/supabase';
export class LeadRepository {
  async create(data: any) {
    const { data: lead, error } = await supabase.from('agent_leads').insert(data).select().single();
    if (error) throw error;
    return lead;
  }
  async findByAgent(agentId: string) {
    const { data, error } = await supabase.from('agent_leads').select('*').eq('agent_id', agentId).is('deleted_at', null);
    if (error) throw error;
    return data;
  }
}
export const leadRepository = new LeadRepository();`,

  'services/lead.service.ts': `import { leadRepository } from '../repositories/lead.repository';
import { agentRepository } from '../repositories/agent.repository';
export class LeadService {
  async createLead(data: any, actorId: string, ip: string, ua: string) {
    const l = await leadRepository.create({ ...data, created_by: actorId, updated_by: actorId });
    await agentRepository.logAudit(actorId, 'LEAD', l.id, 'CREATE', null, l, ip, ua);
    return l;
  }
}
export const leadService = new LeadService();`,

  'controllers/lead.controller.ts': `import { Request, Response } from 'express';
import { leadService } from '../services/lead.service';
export class LeadController {
  static async create(req: Request, res: Response) {
    try {
      const l = await leadService.createLead(req.body, req.user?.id || 'sys', req.ip, req.headers['user-agent'] as string);
      res.status(201).json({ success: true, data: l });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,

  // ================= TENANTS & ACTIVATION =================
  'repositories/tenant.repository.ts': `import { supabase } from '../../../db/supabase';
export class TenantRepository {
  async findByAgent(agentId: string) {
    const { data, error } = await supabase.from('agent_tenants').select('*, tenant_activation_progress(*)').eq('agent_id', agentId);
    if (error) throw error;
    return data;
  }
  async updateActivation(agentTenantId: string, updates: any) {
    const { data, error } = await supabase.from('tenant_activation_progress').update(updates).eq('agent_tenant_id', agentTenantId).select().single();
    if (error) throw error;
    return data;
  }
}
export const tenantRepository = new TenantRepository();`,

  'services/tenant.service.ts': `import { tenantRepository } from '../repositories/tenant.repository';
export class TenantService {
  async updateActivation(agentTenantId: string, stage: string, actorId: string) {
    // In reality this updates flags dynamically based on the stage and calculates completion_percentage
    return tenantRepository.updateActivation(agentTenantId, { current_stage: stage });
  }
}
export const tenantService = new TenantService();`,

  'controllers/tenant.controller.ts': `import { Request, Response } from 'express';
import { tenantService } from '../services/tenant.service';
export class TenantController {
  static async updateActivation(req: Request, res: Response) {
    try {
      const data = await tenantService.updateActivation(req.params.id, req.body.stage, req.user?.id || 'sys');
      res.status(200).json({ success: true, data });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`
};

for (const [filepath, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(basePath, filepath), content);
}
console.log('Milestone 2 Backend generated successfully.');
