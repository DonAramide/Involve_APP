// invify-backend/src/modules/health-insurance/controllers/hmo-portal.controller.ts
import { Request, Response } from 'express';
import { hmoPortalService } from '../services/hmo-portal.service';
import { hmoExcelExchangeService } from '../services/hmo-excel-exchange.service';
import { ResolvedInstitutionContext } from '../services/institution-classification.service';

export class HmoPortalController {
  private static getCtx(req: Request): ResolvedInstitutionContext {
    return (req as any).hmoContext as ResolvedInstitutionContext;
  }

  static async getOverview(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.getDashboardOverview(ctx);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load HMO overview' });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.getOrganizationProfile(ctx);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load HMO profile' });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.updateOrganizationProfile(ctx, req.body || {});
      return res.status(200).json({ success: true, data, message: 'HMO organization profile updated' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to update HMO profile' });
    }
  }

  static async listSchools(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.listSchoolNetwork(ctx);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load school network' });
    }
  }

  static async updateSchoolOnboarding(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const { tenantId } = req.params;
      const data = await hmoPortalService.updateSchoolOnboarding(ctx, tenantId, req.body || {});
      return res.status(200).json({ success: true, data, message: 'School relationship updated' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to update school relationship' });
    }
  }

  static async listPlans(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.listPlansAndVersions(ctx);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load HMO plans' });
    }
  }

  static async createOrVersionPlan(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.createOrVersionPlan(ctx, req.body || {});
      return res.status(201).json({ success: true, data, message: 'HMO plan version saved' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to save HMO plan' });
    }
  }

  static async updatePlanStatus(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const { planId } = req.params;
      const { status } = req.body || {};
      const data = await hmoPortalService.updatePlanStatus(ctx, planId, status);
      return res.status(200).json({ success: true, data, message: 'Plan status updated' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to update plan status' });
    }
  }

  static async listEnrollments(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.listEnrollments(ctx, {
        status: req.query.status as string,
        tenantId: req.query.tenantId as string,
        planId: req.query.planId as string,
        search: req.query.search as string,
      });
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load enrollments' });
    }
  }

  static async adjudicateEnrollment(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const { id } = req.params;
      const data = await hmoPortalService.adjudicateEnrollment(ctx, id, req.body || {});
      return res.status(200).json({ success: true, data, message: `Enrollment ${data.status}` });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to adjudicate enrollment' });
    }
  }

  // ─── Excel/CSV Integration Centre ───────────────────────────────────
  static async listExportMappings(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoExcelExchangeService.listMappings(ctx.hmoProviderId!);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load export mappings' });
    }
  }

  static async saveExportMapping(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoExcelExchangeService.saveMapping(ctx.hmoProviderId!, ctx.authUserId, req.body || {});
      return res.status(200).json({ success: true, data, message: 'Export mapping template saved' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to save export mapping' });
    }
  }

  static async listBatches(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.listBatches(ctx);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load enrollment batches' });
    }
  }

  static async createBatch(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.createEnrollmentBatch(ctx, req.body || {});
      return res.status(201).json({ success: true, data, message: `Batch ${data.batch_reference} created` });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to create enrollment batch' });
    }
  }

  static async exportBatchCsv(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const { batchId } = req.params;
      const data = await hmoPortalService.exportBatchToCsv(ctx, batchId);
      if (req.query.download === 'true') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
        return res.status(200).send(data.csv);
      }
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to export batch CSV' });
    }
  }

  static async reconcileResponseSheet(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const { batchId, fileName, csvContent, commit, idempotencyKey } = req.body || {};
      if (!csvContent || typeof csvContent !== 'string') {
        return res.status(400).json({ success: false, message: 'csvContent is required' });
      }
      const data = await hmoPortalService.reconcileResponseSheet(ctx, {
        batchId,
        fileName: fileName || 'hmo_response.csv',
        csvContent,
        commit: Boolean(commit),
        idempotencyKey,
      });
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to reconcile HMO response sheet' });
    }
  }

  // ─── Provider Network ───────────────────────────────────────────────
  static async listFacilities(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.listFacilities(ctx, {
        state: req.query.state as string,
        search: req.query.search as string,
      });
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load facilities' });
    }
  }

  static async saveFacility(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.saveFacility(ctx, req.body || {});
      return res.status(201).json({ success: true, data, message: 'Facility saved to HMO network' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to save facility' });
    }
  }

  // ─── Pre-Authorization & Claims ─────────────────────────────────────
  static async listClaimsAndPreAuths(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.listClaimsAndPreAuths(ctx, {
        recordType: req.query.recordType as any,
        status: req.query.status as string,
      });
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load claims/pre-authorizations' });
    }
  }

  static async adjudicateClaimOrPreAuth(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const { id } = req.params;
      const data = await hmoPortalService.adjudicateClaimOrPreAuth(ctx, id, req.body || {});
      return res.status(200).json({ success: true, data, message: `Record updated to ${data.status}` });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to adjudicate record' });
    }
  }

  // ─── Billing & Users/Audit ──────────────────────────────────────────
  static async getBillingSummary(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.getBillingSummary(ctx);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load billing summary' });
    }
  }

  static async listUsersAndAudit(req: Request, res: Response) {
    try {
      const ctx = HmoPortalController.getCtx(req);
      const data = await hmoPortalService.listUsersAndAudit(ctx);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to load HMO users and audit' });
    }
  }
}
