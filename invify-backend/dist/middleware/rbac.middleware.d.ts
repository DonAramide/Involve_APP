import { Request, Response, NextFunction } from 'express';
/**
 * Ensures the user has one of the allowed roles.
 */
export declare const checkRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Enforces Tenant Isolation.
 * Rule: Super Admin can access everything.
 * Tenant Admin/Staff can only access their specific tenant.
 */
export declare const checkTenantAccess: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Enforces fine-grained domain permissions for Tenant Users.
 */
export declare const checkTenantPermission: (requiredPermission: string) => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
