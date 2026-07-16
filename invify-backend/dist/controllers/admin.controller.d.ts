import { Request, Response } from 'express';
export declare class AdminController {
    static enterMasterMode(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private static getGlobalSettingsData;
    static getGlobalSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateGlobalSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getGlobalCommissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateGlobalCommissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/tenants
     * Lists all tenants with optional filtering.
     */
    static listTenants(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/tenants
     * Creates a new tenant organization.
     */
    static createTenant(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /admin/tenants/:id
     * Updates tenant details or status.
     */
    static updateTenant(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateTenantStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static triggerEmergencyLock(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static resetTenantPasswords(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/broadcast
     * Sends a real-time socket.io broadcast message to terminals/apps.
     */
    static sendBroadcast(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/tenants/:id/details
     * Fetches detailed data for the Tenant Detail Page.
     */
    static getTenantDetails(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/tenants/:id/provision-virtual-account
     * Provisions a virtual account manually via Quasar SDK if not previously created.
     */
    static provisionVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/tenants/:id/students/:studentId/provision-va
     * Provisions a virtual account manually via Quasar SDK for a specific student.
     */
    static provisionStudentVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/tenants/:id/customers/:customerId/provision-va
     * Provisions a virtual account manually via Quasar SDK for a specific customer.
     */
    static provisionCustomerVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/ledger
     * Immutable financial history with multi-tenant filtering.
     */
    static listLedger(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/payments
     * Oversight of all payment intents and statuses.
     */
    static listPayments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/dashboard-stats
     * Scoped insights for School Owners and Admins.
     */
    static getDashboardStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/notes
     * Hybrid Note Repository: Supports "My Notes" and "School Library".
     */
    static listNotes(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/notes
     * Save an edited version of a note (Preserves isolation).
     */
    static saveNote(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/notes/:id/export
     * Generates and streams a professional PDF version of the lesson note.
     */
    static exportNotePdf(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /admin/profile
     * Updates current user specific metadata (e.g. last_login_at)
     */
    static updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/subscriptions/extend
     * Extends subscriptions for a specific tenant or in bulk based on agentCode/type.
     */
    static extendSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/subscription/status
     * Returns the number of days left on the current tenant's subscription.
     */
    static getSubscriptionStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static uploadCacDocument(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static uploadClaudeBackup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static initVirtualAccountEngine(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private static isNetworkTimeout;
}
