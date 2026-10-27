import { Request, Response } from 'express';
import { MakerCheckerService, makerCheckerPublicView } from '../services/maker-checker.service';
import { requireCheckerMfa } from '../middleware/require-admin-mfa.middleware';

function actorEmail(req: Request): string {
  return String((req as any).user?.email || '').trim().toLowerCase();
}

function isPlatform(req: Request): boolean {
  const role = String((req as any).user?.role || '').toLowerCase();
  return (
    role === 'super_admin' ||
    role === 'internal_staff' ||
    role === 'admin' ||
    role.startsWith('admin_')
  );
}

function runCheckerMfa(req: Request, res: Response): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    const fakeRes: any = {
      status(code: number) {
        res.status(code);
        return fakeRes;
      },
      json(body: any) {
        res.json(body);
        finish(false);
        return fakeRes;
      },
    };
    requireCheckerMfa(req, fakeRes, () => finish(true));
  });
}

export class MakerCheckerController {
  static async list(req: Request, res: Response) {
    try {
      const domain = String(req.query.domain || '').trim();
      const tenantId = (req as any).user?.tenantId || (req as any).user?.tenant_id || null;
      const userId = String((req as any).user?.id || '');
      const rows = MakerCheckerService.list(domain || undefined).filter((row) => {
        if (isPlatform(req)) return true;
        return row.maker.tenantId === tenantId || row.maker.id === userId;
      });
      return res.status(200).json(rows.map(makerCheckerPublicView));
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Could not load approvals.' });
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      const pending = MakerCheckerService.peek(String(req.params.id || ''));
      if (pending?.domain === 'tenant_billing') {
        const ok = await runCheckerMfa(req, res);
        if (!ok) return;
      }
      const result = await MakerCheckerService.approve(String(req.params.id || ''), actorEmail(req));
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.status || 400).json({ error: error.message || 'Approval failed.' });
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const pending = MakerCheckerService.peek(String(req.params.id || ''));
      if (pending?.domain === 'tenant_billing') {
        const ok = await runCheckerMfa(req, res);
        if (!ok) return;
      }
      const result = MakerCheckerService.reject(String(req.params.id || ''), actorEmail(req));
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.status || 400).json({ error: error.message || 'Rejection failed.' });
    }
  }
}
