import { Request, Response } from 'express';
export declare class InvoiceController {
    static createInvoice(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static bulkSyncInvoices(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getInvoices(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getInvoice(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static recordPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getTimeline(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
