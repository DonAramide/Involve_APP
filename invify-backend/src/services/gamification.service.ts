import { GamificationService as ModuleGamificationService } from '../modules/gamification/services/gamification.service';

export class GamificationService {
  static async injectReputation(agentId: string, points: number, reason: string): Promise<void> {
    await ModuleGamificationService.injectReputation(agentId, points, reason);
  }
}
