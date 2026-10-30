import { Request, Response, NextFunction } from 'express';
import { HealthPermission, PlatformHealthPermission, HealthContext } from '../types';
declare global {
    namespace Express {
        interface Request {
            healthContext?: HealthContext;
        }
    }
}
/**
 * Enforces explicit Health permissions.
 * CRITICAL RULE: Super Admin does NOT automatically bypass health permissions.
 * Platform staff require an unexpired hw_platform_grants row or an active
 * hw_platform_entitlements row, plus an audited x-platform-reason.
 * A grant lookup failure or an entitlement lookup failure does not authorize.
 */
export declare function requireHealthPermission(requiredPermission: HealthPermission | PlatformHealthPermission): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
