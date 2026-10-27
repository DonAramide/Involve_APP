// invify-backend/src/modules/health-insurance/guards/hmo-institution.guard.ts
import { Request, Response, NextFunction } from 'express';
import {
  institutionClassificationService,
  HmoPermission,
  ResolvedInstitutionContext,
} from '../services/institution-classification.service';

/**
 * Authoritative HMO Institution Portal Guard.
 * Enforces:
 * 1. Authenticated user (req.user)
 * 2. Authoritative backend institution classification === 'HMO' (never trusts client headers/body)
 * 3. Active approval status & enabled feature flag (portalMode === 'HMO')
 * 4. Optional granular HMO RBAC permission check
 */
export function requireHmoInstitution(requiredPermission?: HmoPermission | HmoPermission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as any).user;
      if (!authUser || (!authUser.id && !authUser.email)) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication is required to access the HMO Institution Portal.',
          },
        });
      }

      const context = await institutionClassificationService.resolveForAgentOrUser({
        authUserId: authUser.id,
        email: authUser.email,
      });

      if (context.institutionType !== 'HMO') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSTITUTION_TYPE_MISMATCH',
            message: `Access denied. This endpoint requires an authenticated HMO institution (resolved: ${context.institutionType}).`,
            resolvedInstitutionType: context.institutionType,
          },
        });
      }

      if (context.portalMode !== 'HMO' || !context.isVerified) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'HMO_PORTAL_RESTRICTED',
            message: context.restrictionReason || 'HMO Institution account is not active or verified.',
            approvalStatus: context.approvalStatus,
            kycStatus: context.kycStatus,
          },
        });
      }

      if (!context.hmoProviderId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'HMO_PROVIDER_UNLINKED',
            message: 'HMO Institution is not linked to an active HMO provider profile.',
          },
        });
      }

      const requestedProviderId =
        (req.query?.hmo_provider_id as string) ||
        (req.query?.provider_id as string) ||
        req.body?.hmo_provider_id ||
        req.body?.provider_id ||
        (req.headers?.['x-hmo-provider-id'] as string);

      if (
        requestedProviderId &&
        String(requestedProviderId).trim().toLowerCase() !==
          String(context.hmoProviderId).trim().toLowerCase()
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'CROSS_HMO_ACCESS_DENIED',
            message:
              'Cross-HMO access is forbidden. You may only access records belonging to your authenticated HMO institution.',
          },
        });
      }

      if (requiredPermission) {
        const needed = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
        const hasAny = needed.some((perm) => context.hmoPermissions.includes(perm));
        if (!hasAny) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'HMO_INSUFFICIENT_PERMISSION',
              message: `Your HMO role (${context.hmoRole}) does not have the required permission (${needed.join(' or ')}).`,
              hmoRole: context.hmoRole,
              requiredPermissions: needed,
            },
          });
        }
      }

      (req as any).hmoContext = context;
      next();
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'HMO_GUARD_FAILURE',
          message: err?.message || 'Failed to verify HMO institution context.',
        },
      });
    }
  };
}

/**
 * Guard for Bank-only Institution endpoints (e.g. POS hardware assignment, terminal sync)
 * so an HMO institution cannot invoke Bank-only operations.
 */
export async function requireBankOrAggregatorInstitution(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authUser = (req as any).user;
    if (!authUser || (!authUser.id && !authUser.email)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const context: ResolvedInstitutionContext =
      await institutionClassificationService.resolveForAgentOrUser({
        authUserId: authUser.id,
        email: authUser.email,
      });

    if (context.institutionType === 'HMO' || context.institutionType === 'HOSPITAL') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BANK_ENDPOINT_FORBIDDEN_FOR_HMO',
          message: `This financial/hardware operation is restricted to Bank/Aggregator institutions and is not available to ${context.institutionType} institutions.`,
        },
      });
    }

    (req as any).institutionContext = context;
    next();
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Institution check failed' });
  }
}
