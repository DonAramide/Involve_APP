import { Request, Response } from 'express';
import { GamificationService } from '../services/gamification.service';

const gamificationService = new GamificationService();

export class GamificationController {
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.query;
      if (!agentId || typeof agentId !== 'string') {
        res.status(400).json({ error: 'agentId query parameter is required' });
        return;
      }
      
      const profile = await gamificationService.getProfile(agentId);
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getBadges(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.query;
      if (!agentId || typeof agentId !== 'string') {
        res.status(400).json({ error: 'agentId query parameter is required' });
        return;
      }

      const badges = await gamificationService.getBadges(agentId);
      res.json(badges);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await gamificationService.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
