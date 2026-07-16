import { Request, Response } from 'express';
export declare class CustomerController {
    /**
     * POST /api/finance/customer-virtual-account/:customerId
     */
    static getVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static searchCustomers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCustomerSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createCustomer(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateCustomer(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
