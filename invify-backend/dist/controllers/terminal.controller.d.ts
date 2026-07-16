import { Request, Response } from 'express';
export declare const terminalUploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare class TerminalController {
    static getTablets(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getMpos(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPrinters(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getTids(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getAssignments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static assignHardware(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static unassignHardware(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static importTerminals(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static mobileSync(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static keyExchangeSuccess(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static mobileStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getAuditLog(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateTablet(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateMpos(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updatePrinter(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateTid(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
