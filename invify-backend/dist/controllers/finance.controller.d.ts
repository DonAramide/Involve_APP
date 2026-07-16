import { Request, Response } from 'express';
export declare class ExecutiveFinanceController {
    /**
     * GET /api/finance/executive-summary
     * Returns a high-level financial overview for school executives.
     */
    static getSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/finance/payouts/stats
     * Returns global system aggregates for payouts/settlements
     */
    static getPayoutStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/v1/finance/settlement-phases
     * Returns a chronological timeline of settlement events derived from actual ledger/settlement records.
     */
    static getSettlementPhases(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
