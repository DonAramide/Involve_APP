import { Request, Response } from 'express';
export declare class CloudMetricsController {
    getOverview(req: Request, res: Response): Promise<void>;
    getSyncHealth(req: Request, res: Response): Promise<void>;
    getTerminals(req: Request, res: Response): Promise<void>;
    getDevices(req: Request, res: Response): Promise<void>;
    getBackups(req: Request, res: Response): Promise<void>;
    getActivityFeed(req: Request, res: Response): Promise<void>;
    getAlerts(req: Request, res: Response): Promise<void>;
}
