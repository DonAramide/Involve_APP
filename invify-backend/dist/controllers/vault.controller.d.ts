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
}
