import { Request, Response } from 'express';
export declare class StudentController {
    /**
     * GET /api/finance/virtual-account/:studentId
     * Provisions or retrieves a student's virtual account.
     */
    static getVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * POST /api/finance/student-virtual-account/:studentId
     * Provisions a dedicated student VA via Quasar (same pattern as staff/customer).
     * Works for local school-mode students that may not yet exist in cloud `students`.
     *
     * Quasar requires `{childId}` to be a UUID. Local apps often send `stu-{admission}`.
     * We map that to a stable UUID for Quasar while keeping the external key for Invify rows.
     */
    static provisionStudentVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static fetchQuasarVa(quasar: any, childId: string): Promise<{
        accountNumber: string;
        bankName: string;
        accountName?: string;
    } | null>;
    static findStoredVa(tenantId: string, externalKey: string, extra?: {
        invifyCustomerId?: string;
        quasarChildId?: string;
        phone?: string;
        fullName?: string;
    }): Promise<{
        accountNumber: string;
        bankName: string;
        accountName?: string;
    } | null>;
}
