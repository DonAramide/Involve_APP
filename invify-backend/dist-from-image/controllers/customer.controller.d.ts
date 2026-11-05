import { Request, Response } from 'express';
export declare class CustomerController {
    /**
     * POST /api/finance/customer-virtual-account/:customerId
     */
    static getVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static searchCustomers(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getCustomerSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createCustomer(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static bulkSyncCustomers(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateCustomer(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getStaffVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static listTenantVirtualAccounts(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getVirtualAccountTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static sweepVirtualAccountFunds(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
