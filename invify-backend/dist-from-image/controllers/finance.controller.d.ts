import { Request, Response } from 'express';
export declare class ExecutiveFinanceController {
    /**
     * GET /api/finance/executive-summary
     * Returns a high-level financial overview for school executives.
     */
    static getSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/v1/finance/invoices/collection-summary
     * Authoritative period totals for Tenant Admin and tablet Invoice History.
     */
    static getCollectionSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/finance/school-dashboard
     * School Finance Dashboard: total revenue plus Quasar card + VA transfer.
     */
    static getSchoolDashboard(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/finance/daily-revenue?days=7
     * Invoice collections + Quasar VA credits grouped by day.
     */
    static getDailyRevenue(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/finance/transactions
     * Live school feed: paid invoices (incl. card/POS) + Quasar VA credits.
     */
    static getSchoolTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
    static getQuasarTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/finance/missed-payments?since=ISO8601
     * Returns SUCCESS inbound credits for this tenant since [since],
     * so offline devices can catch up wallet credits + local notifications on reconnect.
     */
    static getMissedPayments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/finance/student/:studentId/summary
     * School-mode ledger summary for one student / parent key.
     */
    static getStudentSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/finance/student/:studentId/transactions
     */
    static getStudentTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/v1/finance/quasar-resync
     * Pull each Quasar account ledger and record credits Invify is missing.
     * Window: the newest 50 entries, plus any older entry from the last 20 days.
     */
    static resyncQuasar(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
