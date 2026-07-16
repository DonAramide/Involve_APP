import { Request, Response } from 'express';
export declare class StudentController {
    /**
     * GET /api/finance/virtual-account/:studentId
     * Provisions or retrieves a student's virtual account.
     */
    static getVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
