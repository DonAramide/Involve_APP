"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerritoryController = void 0;
const territory_service_1 = require("../services/territory.service");
class TerritoryController {
    static async create(req, res) {
        try {
            const actorId = req.user?.id || 'sys';
            const t = await territory_service_1.territoryService.createTerritory(req.body, actorId, req.ip || '', req.headers['user-agent'] || '');
            res.status(201).json({ success: true, data: t });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async list(req, res) {
        try {
            res.status(200).json({ success: true, data: await territory_service_1.territoryService.listTerritories() });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async update(req, res) {
        try {
            const actorId = req.user?.id || 'sys';
            const t = await territory_service_1.territoryService.updateTerritory(req.params.id, req.body, actorId, req.ip || '', req.headers['user-agent'] || '');
            res.status(200).json({ success: true, data: t });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.TerritoryController = TerritoryController;
//# sourceMappingURL=territory.controller.js.map