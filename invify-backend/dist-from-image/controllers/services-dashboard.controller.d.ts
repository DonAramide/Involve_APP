import { Request, Response } from 'express';
export declare class ServicesDashboardController {
    static getSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static syncJobs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static syncPayments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static syncCustomers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private static upsertBatch;
    private static loadJobs;
    private static loadSyncedJobs;
    private static loadInvoiceJobs;
    private static mapJobRows;
}
