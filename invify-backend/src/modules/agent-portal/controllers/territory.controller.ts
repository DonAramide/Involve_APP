import { Request, Response } from 'express';
import { territoryService } from '../services/territory.service';

export class TerritoryController {
  static async create(req: Request, res: Response) {
    try {
      const actorId = (req as any).user?.id || 'sys';
      const t = await territoryService.createTerritory(req.body, actorId, req.ip || '', (req.headers['user-agent'] as string) || '');
      res.status(201).json({ success: true, data: t });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async list(req: Request, res: Response) {
    try { res.status(200).json({ success: true, data: await territoryService.listTerritories() }); } 
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async update(req: Request, res: Response) {
    try {
      const actorId = (req as any).user?.id || 'sys';
      const t = await territoryService.updateTerritory(req.params.id, req.body, actorId, req.ip || '', (req.headers['user-agent'] as string) || '');
      res.status(200).json({ success: true, data: t });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}