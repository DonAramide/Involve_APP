import { Request, Response } from 'express';
export declare class CommissionController {
    static listApprovals(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static approveCommission(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static rejectCommission(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static executeClawback(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listAuditHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listAgentProgress(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listPlansAndTargets(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createProgram(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateProgram(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteProgram(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createVersion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static cloneVersion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static activateVersion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateVersionRules(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteVersion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createCategoryRule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateCategoryRule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteCategoryRule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createPerformanceRule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updatePerformanceRule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deletePerformanceRule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createTerminalRule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateTerminalRule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteTerminalRule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listCampaignsAndBudgets(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static simulateCommission(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
