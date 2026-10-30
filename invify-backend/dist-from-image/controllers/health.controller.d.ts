import { Request, Response } from 'express';
/** Test helper — do not use in production paths. */
export declare function __setReadyOverrideForTests(value: boolean | null): void;
/**
 * Health contract (Phase 3):
 *   GET /livez  — process alive (no dependency checks)
 *   GET /readyz — ready for traffic (config + optional DB ping)
 *   GET /health — compatibility alias documenting both
 */
export declare class HealthController {
    static livez(_req: Request, res: Response): Response<any, Record<string, any>>;
    static readyz(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** Compatibility endpoint — prefer /livez and /readyz. */
    static health(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
