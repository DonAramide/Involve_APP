import { Request, Response, NextFunction } from 'express';
export declare function requireProductionEnvGovernor(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare class ProductionEnvController {
    static getSnapshot(req: Request, res: Response): Response<any, Record<string, any>>;
    static propose(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static approve(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static reject(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
