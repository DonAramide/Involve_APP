import { Request, Response } from 'express';
/**
 * Staff confirm a company-bank payment only after an admin reads the
 * current authenticator code and gives it to them.
 */
export declare class CompanyTransferAuthController {
    static authorize(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
