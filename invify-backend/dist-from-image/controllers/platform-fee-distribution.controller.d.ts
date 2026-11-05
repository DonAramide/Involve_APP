import { Request, Response } from 'express';
export declare class PlatformFeeDistributionController {
    static distribution(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static agentCommission(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listStakeholders(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createStakeholder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getStakeholder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateStakeholder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listPayables(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listSettlements(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listWithdrawals(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getWithdrawal(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createWithdrawal(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static approveWithdrawal(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static rejectWithdrawal(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static completeSettlement(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
