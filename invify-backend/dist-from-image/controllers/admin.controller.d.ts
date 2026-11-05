import { Request, Response } from 'express';
export declare class AdminController {
    static enterMasterMode(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private static getGlobalSettingsData;
    static getGlobalSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** GET /admin/quasar/pos-encryption-key/status — never returns plaintext key */
    static getQuasarPosEncryptionKeyStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/quasar/pos-encryption-key/rotate
     * Body: { invifyTenantId?, quasarTenantId?, adminJwt?, applyAsPlatformDefault? }
     */
    static rotateQuasarPosEncryptionKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** POST /admin/quasar/pos-encryption-key/store — manual paste of encryption_key_base64 */
    static storeQuasarPosEncryptionKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/quasar/api-key/issue-live
     * Body: { invifyTenantId }
     * Issues sk_live_* on Quasar (required for /pos/*) and stores it.
     */
    static issueQuasarLiveApiKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** GET /admin/quasar/api-key/status?invifyTenantId= */
    static getQuasarApiKeyStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** GET /admin/quasar/integrations — Quasar↔Invify mappings for POS key UI */
    static listQuasarIntegrations(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateGlobalSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPlatformPayoutSettingsPublic(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getGlobalCommissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateGlobalCommissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/tenants
     * Lists all tenants with optional filtering.
     */
    static listTenants(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/tenants/:id/ping-identity
     * Ask the live tablet on this tenant socket room for serial + GPS.
     */
    static pingTenantIdentity(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/tenants/ping-missing-identity
     * Ping every tenant that is missing a hardware serial or GPS location.
     */
    static pingMissingTenantIdentities(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/verification-log
     * Super-admin support view of recent OTP sends, including the 6-digit code.
     */
    static listVerificationLog(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
     * Sends a real-time socket.io broadcast and/or FCM push to terminals/apps.
     * Omit `channels` (or include `websocket`) for the historical socket path.
     * Include `fcm` to fan out via Firebase — requires FCM_SERVICE_ACCOUNT_JSON
     * or FCM_SERVICE_ACCOUNT_PATH on the backend env.
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
    static provisionVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * POST /admin/tenants/:id/students/:studentId/provision-va
     * Provisions a virtual account manually via Quasar SDK for a specific student.
     */
    static provisionStudentVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * POST /admin/tenants/:id/customers/:customerId/provision-va
     * Provisions a virtual account manually via Quasar SDK for a specific customer.
     */
    static provisionCustomerVirtualAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * GET /admin/ledger
     * Immutable financial history with multi-tenant filtering.
     * Falls back to transactions_log when ledger_entries is missing or unreadable.
     */
    static listLedger(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/payments
     * Oversight of all payment intents and statuses.
     */
    static listPayments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/admin/tenant-payables
     * Amount Invify/Quasar currently holds for each tenant (wallet + unswept VAs + unsettled card).
     */
    static listTenantPayables(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/admin/virtual-accounts
     * Every generated Quasar/Invify NUBAN across tenants.
     */
    static listVirtualAccounts(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/admin/virtual-accounts/refresh
     * Pull every Quasar virtual account and store it so the inventory table matches Quasar.
     */
    static refreshVirtualAccounts(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/admin/virtual-accounts/:accountNumber/transactions
     */
    static getVirtualAccountTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
     * GET /admin/profile
     * Returns the authenticated user's profile plus tenant contact/business fields.
     */
    static getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /admin/profile
     * Updates current user profile and syncs owner contact/business onto the tenant
     * so Admin Portal KYC & Users views can display the same data.
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
