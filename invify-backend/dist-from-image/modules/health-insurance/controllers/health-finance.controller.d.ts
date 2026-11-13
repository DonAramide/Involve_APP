import { Request, Response } from 'express';
export declare class HealthFinanceController {
    static getConsolidatedOverview(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getFinanceDrilldown(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getHmoPerformance(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPlanProfitability(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getFinancialTrends(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listAgreements(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createAgreement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static approveAgreement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static previewCalculation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static generateStatement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listStatements(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static approveStatement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listSettlements(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static reconcileSettlement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
