// invify-backend/src/modules/health-insurance/controllers/health.controller.ts
import { Request, Response } from 'express';
import { HealthReportService } from '../services/health-report.service';
import { HealthSettingsService } from '../services/health-settings.service';
import { HealthPlanService } from '../services/health-plan.service';
import { HealthMemberService } from '../services/health-member.service';
import { HealthGuardianService } from '../services/health-guardian.service';
import { HealthEnrolmentService } from '../services/health-enrolment.service';
import { HealthBillingService } from '../services/health-billing.service';
import { HealthClaimService } from '../services/health-claim.service';
import { SandboxHealthProviderAdapter } from '../adapters/sandbox.adapter';

export class HealthController {
  // ─── Dashboard Overview ───────────────────────────────────────────
  static async getOverview(req: Request, res: Response) {
    try {
      const data = await HealthReportService.getOverviewMetrics(req.healthContext!);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to load metrics' } });
    }
  }

  // ─── Settings ─────────────────────────────────────────────────────
  static async getSettings(req: Request, res: Response) {
    try {
      const data = await HealthSettingsService.getSettings(req.healthContext!);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message } });
    }
  }

  static async updateSettings(req: Request, res: Response) {
    try {
      const data = await HealthSettingsService.updateSettings(req.healthContext!, req.body);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  // ─── Providers & Plans ───────────────────────────────────────────
  static async listProviders(req: Request, res: Response) {
    try {
      const data = await HealthPlanService.listProviders();
      return res.status(200).json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message } });
    }
  }

  static async listPlans(req: Request, res: Response) {
    try {
      const data = await HealthPlanService.listPlans(req.query.providerId as string);
      return res.status(200).json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message } });
    }
  }

  static async listTenantOffers(req: Request, res: Response) {
    try {
      const data = await HealthPlanService.listTenantOffers(req.healthContext!);
      return res.status(200).json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message } });
    }
  }

  static async configureTenantOffer(req: Request, res: Response) {
    try {
      const data = await HealthPlanService.configureTenantOffer(req.healthContext!, req.body);
      return res.status(201).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  static async listFacilities(req: Request, res: Response) {
    try {
      const data = await HealthPlanService.listFacilities({
        state: req.query.state as string,
        planId: req.query.planId as string
      });
      return res.status(200).json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message } });
    }
  }

  // ─── Members ──────────────────────────────────────────────────────
  static async listMembers(req: Request, res: Response) {
    try {
      const result = await HealthMemberService.listMembers(req.healthContext!, {
        category: req.query.category as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message } });
    }
  }

  static async enrolStudent(req: Request, res: Response) {
    try {
      const { studentId, cohortLabel } = req.body;
      if (!studentId) return res.status(400).json({ error: { message: 'studentId is required' } });

      const data = await HealthMemberService.enrolStudentMember(req.healthContext!, studentId, cohortLabel);
      return res.status(201).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  static async enrolStaff(req: Request, res: Response) {
    try {
      const data = await HealthMemberService.enrolStaffMember(req.healthContext!, req.body);
      return res.status(201).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  // ─── Guardians ────────────────────────────────────────────────────
  static async inviteGuardian(req: Request, res: Response) {
    try {
      const data = await HealthGuardianService.inviteGuardian(req.healthContext!, req.body);
      return res.status(201).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  static async acceptGuardianInvitation(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: { message: 'Invitation token is required' } });

      const data = await HealthGuardianService.acceptInvitation(user.id, token);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  static async verifyGuardianRelationship(req: Request, res: Response) {
    try {
      const data = await HealthGuardianService.verifyRelationship(req.healthContext!, req.params.linkId, req.body);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  static async listGuardianChildren(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const data = await HealthGuardianService.listGuardianChildren(user.id);
      return res.status(200).json({ children: data });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message } });
    }
  }

  // ─── Enrolments & Policies ────────────────────────────────────────
  static async listEnrolments(req: Request, res: Response) {
    try {
      const result = await HealthEnrolmentService.listEnrolments(req.healthContext!, {
        status: req.query.status as any,
        memberId: req.query.memberId as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message } });
    }
  }

  static async createEnrolment(req: Request, res: Response) {
    try {
      const data = await HealthEnrolmentService.createEnrolment(req.healthContext!, req.body);
      return res.status(201).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  static async verifyEnrolment(req: Request, res: Response) {
    try {
      const data = await HealthEnrolmentService.verifyEnrolment(req.healthContext!, req.params.id, req.body);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  static async simulateSandboxActivation(req: Request, res: Response) {
    try {
      const data = await HealthEnrolmentService.simulateSandboxActivation(req.healthContext!, req.params.id);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  // ─── Billing & Payments ───────────────────────────────────────────
  static async issueInvoice(req: Request, res: Response) {
    try {
      const data = await HealthBillingService.issuePremiumInvoice(req.healthContext!, req.body);
      return res.status(201).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  static async initiatePayment(req: Request, res: Response) {
    try {
      const data = await HealthBillingService.initiatePayment(req.healthContext!, req.params.invoiceId, req.body);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  static async confirmPayment(req: Request, res: Response) {
    try {
      const { paymentId, invoiceId, quasarReference } = req.body;
      const data = await HealthBillingService.processPaymentConfirmation(
        req.healthContext!.tenantId,
        paymentId,
        invoiceId,
        quasarReference
      );
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message } });
    }
  }

  // ─── Claims ───────────────────────────────────────────────────────
  static async listClaims(req: Request, res: Response) {
    try {
      const data = await HealthClaimService.listClaims(req.healthContext!, req.query.policyId as string);
      return res.status(200).json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message } });
    }
  }

  static async lookupClaim(req: Request, res: Response) {
    try {
      const data = await HealthClaimService.lookupClaimStatus(req.healthContext!, req.params.reference);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message } });
    }
  }

  // ─── Provider Webhook Ingress ─────────────────────────────────────
  static async handleProviderWebhook(req: Request, res: Response) {
    try {
      const sandbox = new SandboxHealthProviderAdapter();
      const rawBody = JSON.stringify(req.body);
      const isSigValid = sandbox.verifyWebhookSignature(rawBody, req.headers as any);

      if (!isSigValid) {
        return res.status(401).json({ error: 'Invalid provider signature' });
      }

      return res.status(200).json({ received: true, status: 'processed' });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Webhook processing failed' });
    }
  }
}
