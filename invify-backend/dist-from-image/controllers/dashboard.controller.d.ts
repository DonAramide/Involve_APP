import { Request, Response } from 'express';
export declare class DashboardController {
    static getOverview(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getAlerts(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getGovernance(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getAnalytics(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
