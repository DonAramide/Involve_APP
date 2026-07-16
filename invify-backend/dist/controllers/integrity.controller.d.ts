import { Request, Response } from 'express';
export declare class IntegrityController {
    /**
     * GET /api/finance/integrity/student-balances
     * Validates running_balance cache against raw ledger sums.
     */
    static validateStudentBalances(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/finance/integrity/recompute
     * Forced recomputation of all running_balances from raw ledgers.
     */
    static recomputeBalances(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
