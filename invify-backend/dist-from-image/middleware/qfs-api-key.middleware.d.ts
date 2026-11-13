import { Request, Response, NextFunction } from 'express';
export interface QfsKeyContext {
    keyId: string;
    tenantId: string;
    scopes: string[];
    environment: 'test' | 'live';
    label: string | null;
}
declare global {
    namespace Express {
        interface Request {
            qfsKey?: QfsKeyContext;
        }
    }
}
/**
 * Middleware factory. Pass required scopes e.g. ['sandbox:read'] or ['sandbox:write'].
 * Rejects sk_live_* keys — sandbox only.
 */
export declare function qfsApiKeyAuth(requiredScopes?: string[]): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
