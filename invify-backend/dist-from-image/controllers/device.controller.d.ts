import { Request, Response } from 'express';
export declare class DeviceController {
    /**
     * GET /devices
     * Retrieves all hardware devices
     */
    static getDevices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/devices/connected
     * Live Socket.io sessions on this Node process (not the registered-fleet table).
     */
    static getConnectedPresence(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /devices/activations
     * Retrieves all generated activation codes
     */
    static getActivations(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /devices/activations
     * Generates a new activation key
     */
    static createActivation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /devices/activations/:id/approve
     * Checker: support@iips.app only, and not the maker.
     */
    static approveActivation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /devices/activations/:id/reject
     */
    static rejectActivation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /devices/activations/:id/resend-email
     * Sends the approved activation file to the tenant email again.
     */
    static resendActivationEmail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private static rememberActivationEmail;
    /**
     * POST /devices/validate
     * Validates and redeems a device activation key
     */
    static validateCode(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /devices/:id
     * Updates an existing active device
     */
    static updateDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /devices/activations/:code/reset
     * Resets a used activation key back to pending/unused state, keeping its expiration date.
     */
    static resetActivation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /devices/onboard
     * Register device from mobile client. Uses JWT tenant_id for identity.
     * Classifies device as USER_DEVICE or COMPANY_DEVICE based on terminal_inventory lookup.
     */
    static onboardDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/devices/:deviceId/status
     */
    static getDeviceStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/devices/:deviceId/telemetry
     */
    static getDeviceTelemetry(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/devices/:deviceId/alerts
     */
    static getDeviceAlerts(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/devices/:deviceId/upgrade-to-company
     * Upgrades a USER_DEVICE to a COMPANY_DEVICE, linking it to a terminal inventory record.
     */
    static upgradeToCompany(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static sendCommand(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
