import { Request, Response } from 'express';
export declare class WalletController {
    static getWallet(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getLedger(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getCommissions(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static requestWithdrawal(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static listWithdrawals(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static addBankAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getBankAccounts(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
