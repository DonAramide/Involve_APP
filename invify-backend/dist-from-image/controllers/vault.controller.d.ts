import { Request, Response } from 'express';
export declare class VaultController {
    /**
     * List all integrations.
     * Super Admins see GLOBAL + all TENANT scopes.
     * Operations Admin might only see status and metadata, handled via frontend masking.
     */
    static listIntegrations(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Registers a new integration container (not credentials).
     */
    static registerIntegration(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Adds or rotates a credential securely.
     */
    static addCredential(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Updates an existing credential (name, type, expiry, secret).
     */
    static updateCredential(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Activates a STANDBY credential.
     */
    static activateCredential(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Deletes a credential.
     */
    static deleteCredential(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Tests connection health (dummy ping logic for now, later extended to actual services).
     */
    static testConnection(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static testQuasarPartners(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PUT /vault/meta-whatsapp
     * Upsert Meta WhatsApp Cloud API credentials into Integration Vault.
     * Body may include any of:
     * PUBLIC_API_BASE_URL, WHATSAPP_GRAPH_API_VERSION, WHATSAPP_ACCESS_TOKEN,
     * WHATSAPP_APP_SECRET, WHATSAPP_WEBHOOK_VERIFY_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID,
     * WHATSAPP_PHONE_NUMBER_ID, environment?
     * Never echoes secret values back.
     */
    static upsertMetaWhatsApp(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /vault/meta-whatsapp/status
     * Status-only — never returns plaintext secrets.
     */
    static getMetaWhatsAppStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
