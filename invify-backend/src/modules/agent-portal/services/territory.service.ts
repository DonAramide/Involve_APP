import { territoryRepository } from '../repositories/territory.repository';
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
export const territoryService = new TerritoryService();