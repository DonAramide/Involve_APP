import { Request, Response } from 'express';
/**
 * School payments + disputes synced from the Flutter student profile
 * so tenant admin can audit Cash/POS and raised disputes on web.
 */
export declare class SchoolPaymentsController {
    private static tablesReady;
    private static ensureTables;
    /**
     * POST /api/school/payments/sync
     * Upsert one or more student payment receipts from the device.
     */
    static syncPayments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/school/payments
     * Platform operators may pass ?allTenants=1 to list across schools.
     */
    static listPayments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/school/payment-disputes
     */
    static raiseDispute(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/school/payment-disputes
     * Platform operators may pass ?allTenants=1 to list across schools.
     */
    static listDisputes(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /api/school/payment-disputes/:id
     * Body: { status, resolutionNotes }
     */
    static updateDispute(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Live fallback when school_payment_events is empty / not migrated. */
    private static listPaymentsFromInvoices;
}
