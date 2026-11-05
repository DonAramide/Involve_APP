import { Request, Response } from 'express';
export declare class AgentWebhookController {
    static sessionCommission(req: Request, res: Response): Promise<void>;
    static snapshot(req: Request, res: Response): Promise<void>;
    static saveWebhook(req: Request, res: Response): Promise<void>;
    static enable(req: Request, res: Response): Promise<void>;
    static disable(req: Request, res: Response): Promise<void>;
    static test(req: Request, res: Response): Promise<void>;
    static rotateWebhook(req: Request, res: Response): Promise<void>;
    static rotateApi(req: Request, res: Response): Promise<void>;
    static deliveries(req: Request, res: Response): Promise<void>;
    static adminList(req: Request, res: Response): Promise<void>;
    static adminDeliveries(req: Request, res: Response): Promise<void>;
    static adminEnable(req: Request, res: Response): Promise<void>;
    static adminDisable(req: Request, res: Response): Promise<void>;
    static v1Commission(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static v1Withdrawals(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
