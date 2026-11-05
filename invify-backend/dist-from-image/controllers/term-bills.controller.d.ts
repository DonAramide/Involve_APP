import { Request, Response } from 'express';
export declare class TermBillsController {
    /**
     * POST /api/school/term-bills/email
     * Emails each student bill individually to the parent, with a PDF attachment.
     */
    static emailClassBills(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/school/term-bills/pdf
     * Returns a downloadable PDF for a single bill (same layout as the email attachment).
     */
    static downloadPdf(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
