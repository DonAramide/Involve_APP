import { Request, Response, NextFunction } from 'express';
/**
 * Health Insurance Feature Flag Guard.
 * Default is FALSE unless FEATURE_HEALTH_INSURANCE_ENABLED='true' is explicitly set in env.
 */
export declare function requireHealthInsuranceEnabled(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Ensures that the tenant has enabled Health Insurance in their hw_tenant_settings.
 */
export declare function requireTenantHealthEnabled(tenantId: string): Promise<boolean>;
