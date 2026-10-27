// invify-backend/src/modules/health-insurance/controllers/health-finance.controller.ts
import { Request, Response } from 'express';
import { HealthFinanceService } from '../services/health-finance.service';

function handleFinanceMutationError(res: Response, defaultCode: string, err: any) {
  if (err.message && err.message.startsWith('RELATIONAL_SCHEMA_PENDING')) {
    return res.status(503).json({
      error: {
        code: 'RELATIONAL_SCHEMA_PENDING',
        message: err.message,
        migrationDependency: '20261018000000_hw_50_profit_sharing.sql'
      }
    });
  }
  return res.status(400).json({
    error: { code: defaultCode, message: err.message }
  });
}

export class HealthFinanceController {
  static async getConsolidatedOverview(req: Request, res: Response) {
    try {
      const ctx = req.healthContext!;
      const filters = {
        period: req.query.period as any,
        providerId: req.query.providerId as string,
        planId: req.query.planId as string,
        tenantId: req.query.tenantId as string,
        environment: req.query.environment as any
      };
      const result = await HealthFinanceService.getConsolidatedOverview(ctx, filters);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        error: { code: 'FINANCE_OVERVIEW_ERROR', message: err.message }
      });
    }
  }

  static async getFinanceDrilldown(req: Request, res: Response) {
    try {
      const ctx = req.healthContext!;
      const metric = req.params.metric;
      const result = await HealthFinanceService.getFinanceDrilldown(ctx, metric, req.query);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({
        error: { code: 'DRILLDOWN_ERROR', message: err.message }
      });
    }
  }

  static async getHmoPerformance(req: Request, res: Response) {
    try {
      const ctx = req.healthContext!;
      const filters = {
        period: req.query.period as any,
        environment: req.query.environment as any
      };
      const result = await HealthFinanceService.getHmoPerformance(ctx, filters);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        error: { code: 'HMO_PERFORMANCE_ERROR', message: err.message }
      });
    }
  }

  static async getPlanProfitability(req: Request, res: Response) {
    try {
      const ctx = req.healthContext!;
      const filters = {
        providerId: req.query.providerId as string
      };
      const result = await HealthFinanceService.getPlanProfitability(ctx, filters);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        error: { code: 'PLAN_PROFITABILITY_ERROR', message: err.message }
      });
    }
  }

  static async getFinancialTrends(req: Request, res: Response) {
    try {
      const ctx = req.healthContext!;
      const result = await HealthFinanceService.getFinancialTrends(ctx, req.query);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        error: { code: 'FINANCIAL_TRENDS_ERROR', message: err.message }
      });
    }
  }

  static async listAgreements(req: Request, res: Response) {
    try {
      const ctx = req.healthContext!;
      const status = req.query.status as string;
      const result = await HealthFinanceService.listAgreements(ctx, status);
      return res.status(200).json({ success: true, data: { agreements: result, total: result.length } });
    } catch (err: any) {
      return res.status(500).json({
        error: { code: 'AGREEMENTS_FETCH_ERROR', message: err.message }
      });
    }
  }

  static async createAgreement(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const result = await HealthFinanceService.createAgreement(
        { id: user.id, email: user.email },
        req.body
      );
      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      return handleFinanceMutationError(res, 'AGREEMENT_CREATION_ERROR', err);
    }
  }

  static async approveAgreement(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { checkerNotes } = req.body || {};
      const result = await HealthFinanceService.approveAgreement(
        { id: user.id, email: user.email },
        id,
        checkerNotes
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return handleFinanceMutationError(res, 'AGREEMENT_APPROVAL_ERROR', err);
    }
  }

  static async previewCalculation(req: Request, res: Response) {
    try {
      const ctx = req.healthContext!;
      const agreementId = req.query.agreementId as string;
      const periodKey = (req.query.periodKey as string) || '2026-M10';
      if (!agreementId) {
        return res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'agreementId is required' } });
      }
      const result = await HealthFinanceService.previewCalculation(ctx, agreementId, periodKey);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({
        error: { code: 'CALCULATION_PREVIEW_ERROR', message: err.message }
      });
    }
  }

  static async generateStatement(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { agreementId, periodKey } = req.body;
      if (!agreementId || !periodKey) {
        return res.status(400).json({ error: { code: 'MISSING_PARAMS', message: 'agreementId and periodKey are required' } });
      }
      const result = await HealthFinanceService.generateStatement(
        { id: user.id, email: user.email },
        agreementId,
        periodKey
      );
      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      return handleFinanceMutationError(res, 'STATEMENT_GENERATION_ERROR', err);
    }
  }

  static async listStatements(req: Request, res: Response) {
    try {
      const ctx = req.healthContext!;
      const result = await HealthFinanceService.listStatements(ctx, req.query);
      return res.status(200).json({ success: true, data: { statements: result, total: result.length } });
    } catch (err: any) {
      return res.status(500).json({
        error: { code: 'STATEMENTS_FETCH_ERROR', message: err.message }
      });
    }
  }

  static async approveStatement(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { checkerNotes } = req.body || {};
      const result = await HealthFinanceService.approveStatement(
        { id: user.id, email: user.email },
        id,
        checkerNotes
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return handleFinanceMutationError(res, 'STATEMENT_APPROVAL_ERROR', err);
    }
  }

  static async listSettlements(req: Request, res: Response) {
    try {
      const ctx = req.healthContext!;
      const result = await HealthFinanceService.listSettlements(ctx, req.query);
      return res.status(200).json({ success: true, data: { settlements: result, total: result.length } });
    } catch (err: any) {
      return res.status(500).json({
        error: { code: 'SETTLEMENTS_FETCH_ERROR', message: err.message }
      });
    }
  }

  static async reconcileSettlement(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { externalReference, reconciliationNotes } = req.body;
      const result = await HealthFinanceService.reconcileSettlement(
        { id: user.id, email: user.email },
        id,
        { externalReference, reconciliationNotes }
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return handleFinanceMutationError(res, 'SETTLEMENT_RECONCILIATION_ERROR', err);
    }
  }
}
