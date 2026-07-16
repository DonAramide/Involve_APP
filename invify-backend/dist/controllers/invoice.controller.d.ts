import { Request, Response } from 'express';
export declare class InvoiceController {
    static createInvoice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getInvoices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getInvoice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static recordPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getTimeline(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
