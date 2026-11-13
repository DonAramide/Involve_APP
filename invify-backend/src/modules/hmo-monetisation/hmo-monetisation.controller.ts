import { Request, Response } from 'express';
import {
  BankAccountGovernanceService,
  BankEntityType,
} from './bank-account-governance.service';
import { SupabaseBankAccountStore } from './supabase-bank-account.store';

const bankAccountGovernanceService = new BankAccountGovernanceService(new SupabaseBankAccountStore());
import { loadInstitutionHmoEarnings } from './institution-earnings.service';
import { InstitutionWithdrawalService } from './institution-withdrawal.service';
import { loadHmoFinanceReport } from './hmo-finance-report.service';
import { evaluateHmoServiceCharge } from './hmo-service-fee';

const withdrawals = new InstitutionWithdrawalService(bankAccountGovernanceService);

function actor(req: Request) {
  const user = (req as any).user || {};
  return { id: String(user.id || user.userId || ''), email: user.email || null };
}

function sendError(res: Response, err: any) {
  const status = Number(err?.status || 500);
  return res.status(status).json({
    success: false,
    error: { code: err?.code || 'HMO_MONETISATION_ERROR', message: err?.message || 'Request failed' },
  });
}

export class HmoMonetisationController {
  static async previewFee(req: Request, res: Response) {
    try {
      const data = evaluateHmoServiceCharge({
        tenantId: String(req.body?.tenantId || req.body?.tenant_id || ''),
        enrolmentId: req.body?.enrolmentId || req.body?.enrolment_id,
        enrolmentStatus: req.body?.enrolmentStatus || req.body?.enrolment_status,
        invoicePaid: Boolean(req.body?.invoicePaid ?? req.body?.invoice_paid),
        requestCancelled: Boolean(req.body?.requestCancelled ?? req.body?.request_cancelled),
        premiumMinor: Number(req.body?.premiumMinor ?? req.body?.premium_minor ?? 0),
        paymentId: req.body?.paymentId || req.body?.payment_id,
        invoiceId: req.body?.invoiceId || req.body?.invoice_id,
      });
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async adminBankList(req: Request, res: Response) {
    try {
      const data = await bankAccountGovernanceService.list({
        entityType: req.query.entityType as BankEntityType | undefined,
        status: (req.query.status as any) || 'ALL',
      });
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async adminBankGet(req: Request, res: Response) {
    try {
      const data = await bankAccountGovernanceService.get(String(req.params.id));
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async adminBankDecide(req: Request, res: Response) {
    try {
      const user = actor(req);
      const data = await bankAccountGovernanceService.decide({
        id: String(req.params.id),
        actorId: user.id,
        action: String(req.body?.action || '').toUpperCase() as 'APPROVE' | 'REJECT' | 'REQUEST_VERIFICATION',
        reason: req.body?.reason,
      });
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async entityBankList(req: Request, res: Response) {
    try {
      const entityType = String(req.params.entityType || '').toUpperCase() as BankEntityType;
      const entityId = String(req.params.entityId || '');
      const [requests, approved] = await Promise.all([
        bankAccountGovernanceService.list({ entityType, entityId }),
        bankAccountGovernanceService.approvedAccount(entityType, entityId),
      ]);
      return res.status(200).json({
        success: true,
        data: {
          approved,
          requests,
          notice:
            'Changes to your settlement bank account require Super Admin verification. Your previously approved account remains active until the new account is approved.',
        },
      });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async entityBankSubmit(req: Request, res: Response) {
    try {
      const user = actor(req);
      const entityType = String(req.params.entityType || '').toUpperCase() as BankEntityType;
      const data = await bankAccountGovernanceService.submit({
        entityType,
        entityId: String(req.params.entityId || ''),
        entityName: String(req.body?.entityName || req.body?.businessName || ''),
        requesterUserId: user.id,
        requesterEmail: user.email,
        proposed: {
          bankCode: req.body?.bankCode || req.body?.bank_code,
          bankName: req.body?.bankName || req.body?.bank_name,
          accountNumber: req.body?.accountNumber || req.body?.account_number,
          accountName: req.body?.accountName || req.body?.account_name,
        },
      });
      return res.status(201).json({ success: true, data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async institutionEarnings(req: Request, res: Response) {
    try {
      const ctx = (req as any).hmoContext;
      const institutionId = String(ctx?.institutionId || req.params.institutionId || '');
      if (!institutionId) {
        return res.status(403).json({ success: false, error: { code: 'INSTITUTION_REQUIRED', message: 'Institution context is required.' } });
      }
      const data = await loadInstitutionHmoEarnings({
        institutionId,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        tenantId: req.query.tenantId as string | undefined,
        providerId: req.query.providerId as string | undefined,
      });
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async institutionWithdrawals(req: Request, res: Response) {
    try {
      const ctx = (req as any).hmoContext;
      const institutionId = String(ctx?.institutionId || '');
      return res.status(200).json({
        success: true,
        data: {
          available_kobo: 0,
          reserved_kobo: withdrawals.reservedKobo(institutionId),
          withdrawals: withdrawals.list(institutionId),
          payouts_enabled: false,
        },
      });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async createInstitutionWithdrawal(req: Request, res: Response) {
    try {
      const ctx = (req as any).hmoContext;
      const user = actor(req);
      const data = await withdrawals.submit({
        institutionId: String(ctx?.institutionId || ''),
        institutionActive: Boolean(ctx?.isVerified),
        requesterUserId: user.id,
        amountKobo: Number(req.body?.amountKobo ?? req.body?.amount_kobo ?? 0),
        availableKobo: 0,
        idempotencyKey: req.body?.idempotencyKey || req.body?.idempotency_key,
      });
      return res.status(201).json({ success: true, data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async financeReport(req: Request, res: Response) {
    try {
      const data = await loadHmoFinanceReport({
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        institutionId: req.query.institutionId as string | undefined,
        tenantId: req.query.tenantId as string | undefined,
        providerId: req.query.providerId as string | undefined,
      });
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return sendError(res, err);
    }
  }
}

export { withdrawals as institutionWithdrawalStore };
