import { Request, Response } from 'express';
export declare class GamificationController {
    getProfile(req: Request, res: Response): Promise<void>;
    getBadges(req: Request, res: Response): Promise<void>;
    getLeaderboard(req: Request, res: Response): Promise<void>;
}
