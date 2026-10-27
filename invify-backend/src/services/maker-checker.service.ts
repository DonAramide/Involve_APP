import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { canApproveAsSupport } from '../utils/support-approver';

export type MakerCheckerDomain = 'pos_switchboard' | 'staff_management' | 'tenant_billing';

export type MakerCheckerAction =
  | 'routing_config'
  | 'quasar_base_url'
  | 'user_create'
  | 'user_update'
  | 'user_reset_mfa'
  | 'user_reset_password'
  | 'staff_invite'
  | 'create_plan'
  | 'post_payment';

type MakerSnapshot = {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
};

export type MakerCheckerRequest = {
  id: string;
  domain: MakerCheckerDomain;
  action: MakerCheckerAction;
  target: string;
  summary: string;
  body: Record<string, any>;
  params: Record<string, any>;
  maker: MakerSnapshot;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decidedAt?: string;
  checkerEmail?: string;
};

function queueFilePath(): string {
  if (process.env.MAKER_CHECKER_QUEUE_FILE) return process.env.MAKER_CHECKER_QUEUE_FILE;
  const variant = String(process.env.NODE_ENV || 'local').replace(/[^a-z0-9_-]/gi, '') || 'local';
  const name = `maker-checker-queue-${variant}.json`;
  const shared = '/srv/invify/shared';
  try {
    if (fs.existsSync(shared)) {
      fs.accessSync(shared, fs.constants.W_OK);
      return path.join(shared, name);
    }
  } catch {
    /* local fallback */
  }
  return path.join(process.cwd(), name);
}

function readQueue(): MakerCheckerRequest[] {
  const filePath = queueFilePath();
  try {
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(rows: MakerCheckerRequest[]) {
  const filePath = queueFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8');
}

export function makerCheckerPublicView(row: MakerCheckerRequest) {
  return {
    id: row.id,
    domain: row.domain,
    action: row.action,
    target: row.target,
    summary: row.summary,
    makerEmail: row.maker?.email || '',
    status: row.status,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt || null,
    checkerEmail: row.checkerEmail || null,
  };
}

function actorFrom(req: Request): MakerSnapshot {
  const user = (req as any).user || {};
  return {
    id: String(user.id || ''),
    email: String(user.email || '').trim().toLowerCase(),
    role: String(user.role || ''),
    tenantId: user.tenantId || user.tenant_id || null,
  };
}

export function isMakerCheckerApply(req: Request): boolean {
  return (req as any).makerCheckerApply === true;
}

export class MakerCheckerService {
  static propose(input: {
    domain: MakerCheckerDomain;
    action: MakerCheckerAction;
    target?: string;
    summary: string;
    body?: Record<string, any>;
    params?: Record<string, any>;
    maker: MakerSnapshot;
  }): MakerCheckerRequest {
    if (!input.maker.email) {
      throw Object.assign(new Error('Sign in is required before submitting a change.'), { status: 401 });
    }
    const rows = readQueue();
    const target = String(input.target || '');
    const existing = rows.find(
      (row) =>
        row.status === 'pending' &&
        row.domain === input.domain &&
        row.action === input.action &&
        row.target === target,
    );
    const next: MakerCheckerRequest = {
      id: existing?.id || randomUUID(),
      domain: input.domain,
      action: input.action,
      target,
      summary: String(input.summary || input.action).slice(0, 240),
      body: input.body || {},
      params: input.params || {},
      maker: input.maker,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const without = rows.filter((row) => row.id !== next.id);
    without.unshift(next);
    writeQueue(without.slice(0, 200));
    return next;
  }

  static list(domain?: string): MakerCheckerRequest[] {
    const rows = readQueue().filter((row) => row.status === 'pending');
    if (!domain) return rows;
    return rows.filter((row) => row.domain === domain);
  }

  static peek(id: string): MakerCheckerRequest | undefined {
    return readQueue().find((item) => item.id === id);
  }

  static async approve(id: string, actorEmail: string) {
    const rows = readQueue();
    const row = rows.find((item) => item.id === id);
    if (!row || row.status !== 'pending') {
      throw Object.assign(new Error('This change is no longer waiting for approval.'), { status: 404 });
    }
    const gate = canApproveAsSupport(actorEmail, row.maker.email);
    if (!gate.ok) throw Object.assign(new Error(gate.error), { status: 403 });
    const applied = await applyRequest(row);
    if (applied.statusCode >= 400) {
      const message = applied.body?.error || applied.body?.message || 'The change could not be applied.';
      throw Object.assign(new Error(message), { status: applied.statusCode });
    }
    row.status = 'approved';
    row.decidedAt = new Date().toISOString();
    row.checkerEmail = String(actorEmail || '').trim().toLowerCase();
    writeQueue(rows);
    return { request: makerCheckerPublicView(row), result: applied.body };
  }

  static reject(id: string, actorEmail: string) {
    const rows = readQueue();
    const row = rows.find((item) => item.id === id);
    if (!row || row.status !== 'pending') {
      throw Object.assign(new Error('This change is no longer waiting for approval.'), { status: 404 });
    }
    const gate = canApproveAsSupport(actorEmail, row.maker.email);
    if (!gate.ok) throw Object.assign(new Error(gate.error), { status: 403 });
    row.status = 'rejected';
    row.decidedAt = new Date().toISOString();
    row.checkerEmail = String(actorEmail || '').trim().toLowerCase();
    writeQueue(rows);
    void MakerCheckerService.notifyRejectedBilling(row).catch((e: any) =>
      console.warn('[maker-checker] reject notify failed:', e?.message || e),
    );
    return makerCheckerPublicView(row);
  }

  static async notifyRejectedBilling(row: MakerCheckerRequest) {
    if (row.domain !== 'tenant_billing' || row.action !== 'post_payment') return;
    const { notifyTenantBillingPayment } = await import('../modules/tenant-billing/notify');
    const amountNaira = row.body?.amountNaira != null ? Number(row.body.amountNaira) : null;
    await notifyTenantBillingPayment({
      tenantId: String(row.body?.tenantId || ''),
      stage: 'rejected',
      amountLabel:
        amountNaira != null && Number.isFinite(amountNaira)
          ? `₦${amountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : undefined,
      amountKobo: row.body?.amountKobo != null ? Number(row.body.amountKobo) : undefined,
      reference: row.body?.reference,
    });
  }
}

export function submitSupportChange(
  req: Request,
  input: {
    domain: MakerCheckerDomain;
    action: MakerCheckerAction;
    target?: string;
    summary: string;
    body?: Record<string, any>;
    params?: Record<string, any>;
  },
) {
  return MakerCheckerService.propose({ ...input, maker: actorFrom(req) });
}

export async function holdForSupportApproval(
  req: Request,
  res: Response,
  input: {
    domain: MakerCheckerDomain;
    action: MakerCheckerAction;
    target?: string;
    summary: string;
    body?: Record<string, any>;
    params?: Record<string, any>;
  },
): Promise<boolean> {
  if (isMakerCheckerApply(req)) return false;
  try {
    const row = submitSupportChange(req, input);
    res.status(202).json({
      pending: true,
      id: row.id,
      message: 'Submitted. Only support@iips.app can approve this change.',
    });
    return true;
  } catch (error: any) {
    res.status(error.status || 400).json({ error: error.message || 'Could not submit this change.' });
    return true;
  }
}

function captureResponse() {
  const out: { statusCode: number; body: any } = { statusCode: 200, body: null };
  const res = {
    status(code: number) {
      out.statusCode = code;
      return this;
    },
    json(body: any) {
      out.body = body;
      return this;
    },
    send(body: any) {
      out.body = body;
      return this;
    },
  };
  return { out, res };
}

async function applyRequest(row: MakerCheckerRequest) {
  const { out, res } = captureResponse();
  const req: any = {
    body: row.body || {},
    params: row.params || {},
    query: {},
    headers: { 'x-forwarded-for': 'maker-checker' },
    socket: { remoteAddress: 'maker-checker' },
    ip: 'maker-checker',
    user: {
      id: row.maker.id,
      email: row.maker.email,
      role: row.maker.role,
      tenantId: row.maker.tenantId,
    },
    makerCheckerApply: true,
  };
  if (row.action === 'routing_config') {
    const { PosController } = await import('../controllers/pos.controller');
    await PosController.updateRoutingConfig(req, res as any);
  } else if (row.action === 'quasar_base_url') {
    const { AdminController } = await import('../controllers/admin.controller');
    await AdminController.updateGlobalSettings(req, res as any);
  } else if (row.action === 'user_create') {
    const { UserController } = await import('../controllers/user.controller');
    await UserController.createUser(req, res as any);
  } else if (row.action === 'user_update') {
    const { UserController } = await import('../controllers/user.controller');
    await UserController.updateUser(req, res as any);
  } else if (row.action === 'user_reset_mfa') {
    const { UserController } = await import('../controllers/user.controller');
    await UserController.resetUserMfa(req, res as any);
  } else if (row.action === 'user_reset_password') {
    const { AuthController } = await import('../controllers/auth.controller');
    req.body = { userId: row.params?.id || row.body?.userId, newPassword: row.body?.newPassword };
    await AuthController.resetPassword(req, res as any);
  } else if (row.action === 'staff_invite') {
    const { InviteController } = await import('../controllers/invite.controller');
    await InviteController.sendInvite(req, res as any);
  } else if (row.action === 'create_plan') {
    const { TenantBillingController } = await import('../controllers/tenant-billing.controller');
    await TenantBillingController.createPlan(req, res as any);
  } else if (row.action === 'post_payment') {
    const { TenantBillingController } = await import('../controllers/tenant-billing.controller');
    await TenantBillingController.postPayment(req, res as any);
  } else {
    out.statusCode = 400;
    out.body = { error: 'Unknown change type.' };
  }
  return out;
}
