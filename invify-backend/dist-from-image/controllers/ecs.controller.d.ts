import { Request, Response } from 'express';
export declare class EcsController {
    static getProviders(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getDefinitions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static resolveConfiguration(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static saveConfiguration(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static runHealthCheck(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private static formatSuccess;
    private static formatError;
}
