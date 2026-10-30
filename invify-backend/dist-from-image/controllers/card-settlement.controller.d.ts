import { Request, Response } from 'express';
export declare const cardSettlementUploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare class CardSettlementController {
    static listTemplates(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listBatches(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getBatch(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static uploadSettlementFile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
