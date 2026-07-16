"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.territoryService = exports.TerritoryService = void 0;
const territory_repository_1 = require("../repositories/territory.repository");
const agent_repository_1 = require("../repositories/agent.repository");
class TerritoryService {
    async createTerritory(data, actorId, ip, ua) {
        const t = await territory_repository_1.territoryRepository.create({ ...data, created_by: actorId, updated_by: actorId });
        await agent_repository_1.agentRepository.logAudit(actorId, 'TERRITORY', t.id, 'CREATE', null, t, ip, ua);
        return t;
    }
    async listTerritories() { return territory_repository_1.territoryRepository.findAll(); }
    async updateTerritory(id, updates, actorId, ip, ua) {
        updates.updated_by = actorId;
        const old = await territory_repository_1.territoryRepository.findAll().then(res => res.find((r) => r.id === id));
        const t = await territory_repository_1.territoryRepository.update(id, updates);
        await agent_repository_1.agentRepository.logAudit(actorId, 'TERRITORY', t.id, 'UPDATE', old, t, ip, ua);
        return t;
    }
}
exports.TerritoryService = TerritoryService;
exports.territoryService = new TerritoryService();
//# sourceMappingURL=territory.service.js.map