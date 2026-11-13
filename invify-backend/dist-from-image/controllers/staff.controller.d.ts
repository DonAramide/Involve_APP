import { Request, Response } from 'express';
/**
 * Pin stored for a tablet sync. A portal-locked pin wins. Otherwise a
 * 64-char hash from the device is kept so a replacement tablet can sign in.
 */
export declare function resolveIncomingPinHash(raw: any, existingHash: string | null, portalLocked: boolean): string | null;
/**
 * POS staff roster synced from Flutter (incl. personal salary bank).
 * Separate from Quasar collection VAs on users.virtual_account_*.
 */
export declare class StaffController {
    private static tablesReady;
    private static columnsReady;
    private static ensureTables;
    /**
     * POST /api/staff/bulk-sync
     * Body: { staff: [...] } from Flutter Web Sync / staff save.
     */
    static bulkSync(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/staff
     * List synced POS staff for tenant admin.
     */
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/staff
     * Provision an operator from the tenant portal (role + PIN hash).
     */
    static create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /api/staff/:id
     * Portal governance: role, suspend/reactivate, PIN reset.
     */
    static patch(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/staff/:id/pay-salary
     * Debit tenant wallet and transfer to staff personal bank.
     */
    static paySalary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
