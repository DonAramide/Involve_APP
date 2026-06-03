const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'src', 'modules', 'agent-portal');
const dirs = ['repositories', 'services', 'controllers', 'routes', 'tests'];

dirs.forEach(d => {
  const p = path.join(basePath, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const files = {
  // ================= TERRITORY =================
  'repositories/territory.repository.ts': `import { supabase } from '../../../db/supabase';

export class TerritoryRepository {
  async create(data: any) {
    const { data: territory, error } = await supabase.from('agent_territories').insert(data).select().single();
    if (error) throw error;
    return territory;
  }
  async findAll() {
    const { data, error } = await supabase.from('agent_territories').select('*').is('deleted_at', null);
    if (error) throw error;
    return data;
  }
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('agent_territories').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
}
export const territoryRepository = new TerritoryRepository();`,

  'services/territory.service.ts': `import { territoryRepository } from '../repositories/territory.repository';
import { agentRepository } from '../repositories/agent.repository';

export class TerritoryService {
  async createTerritory(data: any, actorId: string, ip: string, ua: string) {
    const t = await territoryRepository.create({ ...data, created_by: actorId, updated_by: actorId });
    await agentRepository.logAudit(actorId, 'TERRITORY', t.id, 'CREATE', null, t, ip, ua);
    return t;
  }
  async listTerritories() { return territoryRepository.findAll(); }
  async updateTerritory(id: string, updates: any, actorId: string, ip: string, ua: string) {
    updates.updated_by = actorId;
    const old = await territoryRepository.findAll().then(res => res.find((r: any) => r.id === id));
    const t = await territoryRepository.update(id, updates);
    await agentRepository.logAudit(actorId, 'TERRITORY', t.id, 'UPDATE', old, t, ip, ua);
    return t;
  }
}
export const territoryService = new TerritoryService();`,

  'controllers/territory.controller.ts': `import { Request, Response } from 'express';
import { territoryService } from '../services/territory.service';

export class TerritoryController {
  static async create(req: Request, res: Response) {
    try {
      const actorId = req.user?.id || 'sys';
      const t = await territoryService.createTerritory(req.body, actorId, req.ip, req.headers['user-agent'] as string);
      res.status(201).json({ success: true, data: t });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async list(req: Request, res: Response) {
    try { res.status(200).json({ success: true, data: await territoryService.listTerritories() }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async update(req: Request, res: Response) {
    try {
      const actorId = req.user?.id || 'sys';
      const t = await territoryService.updateTerritory(req.params.id, req.body, actorId, req.ip, req.headers['user-agent'] as string);
      res.status(200).json({ success: true, data: t });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,

  // ================= PROFILE =================
  'repositories/profile.repository.ts': `import { supabase } from '../../../db/supabase';

export class ProfileRepository {
  async getByAgentId(agentId: string) {
    const { data, error } = await supabase.from('agent_profiles').select('*').eq('agent_id', agentId).is('deleted_at', null).single();
    if (error) throw error;
    return data;
  }
  async update(agentId: string, updates: any) {
    const { data, error } = await supabase.from('agent_profiles').update(updates).eq('agent_id', agentId).select().single();
    if (error) throw error;
    return data;
  }
}
export const profileRepository = new ProfileRepository();`,

  'services/profile.service.ts': `import { profileRepository } from '../repositories/profile.repository';
import { agentRepository } from '../repositories/agent.repository';

export class ProfileService {
  async getProfile(agentId: string) { return profileRepository.getByAgentId(agentId); }
  async updateProfile(agentId: string, updates: any, actorId: string, ip: string, ua: string) {
    updates.updated_by = actorId;
    const old = await profileRepository.getByAgentId(agentId);
    const p = await profileRepository.update(agentId, updates);
    await agentRepository.logAudit(actorId, 'PROFILE', agentId, 'UPDATE', old, p, ip, ua);
    return p;
  }
}
export const profileService = new ProfileService();`,

  'controllers/profile.controller.ts': `import { Request, Response } from 'express';
import { profileService } from '../services/profile.service';

export class ProfileController {
  static async get(req: Request, res: Response) {
    try {
      const agentId = req.user?.id; // Must be extracted from JWT
      res.status(200).json({ success: true, data: await profileService.getProfile(agentId) });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async update(req: Request, res: Response) {
    try {
      const agentId = req.user?.id;
      const p = await profileService.updateProfile(agentId, req.body, agentId, req.ip, req.headers['user-agent'] as string);
      res.status(200).json({ success: true, data: p });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,

  // ================= NOTIFICATIONS =================
  'repositories/notification.repository.ts': `import { supabase } from '../../../db/supabase';
export class NotificationRepository {
  async list(agentId: string, unreadOnly: boolean) {
    let q = supabase.from('agent_notifications').select('*').eq('agent_id', agentId);
    if (unreadOnly) q = q.eq('is_read', false);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }
  async markRead(id: string) {
    const { data, error } = await supabase.from('agent_notifications').update({ is_read: true, read_at: new Date() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
}
export const notificationRepository = new NotificationRepository();`,

  'services/notification.service.ts': `import { notificationRepository } from '../repositories/notification.repository';
export class NotificationService {
  async list(agentId: string, unreadOnly: boolean) { return notificationRepository.list(agentId, unreadOnly); }
  async markRead(id: string) { return notificationRepository.markRead(id); }
}
export const notificationService = new NotificationService();`,

  'controllers/notification.controller.ts': `import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
export class NotificationController {
  static async list(req: Request, res: Response) {
    try {
      const agentId = req.user?.id;
      res.status(200).json({ success: true, data: await notificationService.list(agentId, req.query.unreadOnly === 'true') });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async markRead(req: Request, res: Response) {
    try { res.status(200).json({ success: true, data: await notificationService.markRead(req.params.id) }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,

  // ================= DASHBOARD =================
  'repositories/dashboard.repository.ts': `import { supabase } from '../../../db/supabase';
export class DashboardRepository {
  async getMetrics(agentId: string) {
    const { data, error } = await supabase.from('agent_dashboard_snapshots').select('*').eq('agent_id', agentId).order('snapshot_date', { ascending: false }).limit(30);
    if (error) throw error;
    return data;
  }
}
export const dashboardRepository = new DashboardRepository();`,
  'services/dashboard.service.ts': `import { dashboardRepository } from '../repositories/dashboard.repository';
export class DashboardService {
  async getMetrics(agentId: string) { return dashboardRepository.getMetrics(agentId); }
}
export const dashboardService = new DashboardService();`,
  'controllers/dashboard.controller.ts': `import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
export class DashboardController {
  static async getMetrics(req: Request, res: Response) {
    try { res.status(200).json({ success: true, data: await dashboardService.getMetrics(req.user?.id) }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,

  // ================= RBAC =================
  'repositories/rbac.repository.ts': `import { supabase } from '../../../db/supabase';
export class RbacRepository {
  async listRoles() {
    const { data, error } = await supabase.from('agent_roles').select('*');
    if (error) throw error;
    return data;
  }
}
export const rbacRepository = new RbacRepository();`,
  'services/rbac.service.ts': `import { rbacRepository } from '../repositories/rbac.repository';
export class RbacService {
  async listRoles() { return rbacRepository.listRoles(); }
}
export const rbacService = new RbacService();`,
  'controllers/rbac.controller.ts': `import { Request, Response } from 'express';
import { rbacService } from '../services/rbac.service';
export class RbacController {
  static async listRoles(req: Request, res: Response) {
    try { res.status(200).json({ success: true, data: await rbacService.listRoles() }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`
};

for (const [filepath, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(basePath, filepath), content);
}
console.log('Backend generated successfully.');
