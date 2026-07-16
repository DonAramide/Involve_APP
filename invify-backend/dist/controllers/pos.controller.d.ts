import { Request, Response } from 'express';
export declare class PosController {
    static processTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getTransactionHistory(req: Request, res: Response): Promise<void>;
    static getRoutingConfig(req: Request, res: Response): Promise<void>;
    static updateRoutingConfig(req: Request, res: Response): Promise<void>;
    static getObservabilityMetrics(req: Request, res: Response): Promise<void>;
    static simulateRoute(req: Request, res: Response): Promise<void>;
    /**
     * Force-refresh the Kimono terminal params cache for a specific terminal.
     * Useful after key rotation at Cpoint.
     * POST /admin/pos/kimono-params/refresh  { terminalId }
     */
    static refreshKimonoParams(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Debug endpoint — parses a raw hex ISO8583 message and returns decoded fields.
     * POST /api/pos/test-iso  { hexMessage: "0210..." }
     * Protected by authenticate middleware in app.ts.
     */
    static testIso(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getAffectedDevices(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    private static isNetworkTimeout;
}
