import { Request, Response, NextFunction } from 'express';
import { HmoPermission } from '../services/institution-classification.service';
/**
 * Authoritative HMO Institution Portal Guard.
 * Enforces:
 * 1. Authenticated user (req.user)
 * 2. Authoritative backend institution classification === 'HMO' (never trusts client headers/body)
 * 3. Active approval status & enabled feature flag (portalMode === 'HMO')
 * 4. Optional granular HMO RBAC permission check
 */
export declare function requireHmoInstitution(requiredPermission?: HmoPermission | HmoPermission[]): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Guard for Bank-only Institution endpoints (e.g. POS hardware assignment, terminal sync)
 * so an HMO institution cannot invoke Bank-only operations.
 */
export declare function requireBankOrAggregatorInstitution(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
