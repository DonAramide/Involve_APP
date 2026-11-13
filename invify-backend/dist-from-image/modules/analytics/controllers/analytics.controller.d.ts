import { Request, Response } from 'express';
export declare class M6AnalyticsController {
    static getPerformance(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getTerritory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getRiskSignals(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
