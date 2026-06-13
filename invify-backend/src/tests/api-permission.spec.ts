import { describe, it, expect, vi } from 'vitest';
import { checkTenantPermission } from '../middleware/rbac.middleware';

describe('Backend API Permission Validation', () => {
  it('allows access when user has required permission', () => {
    const req = {
      user: {
        permissions: ['tenant.wallet.view']
      }
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;
    const next = vi.fn();

    const middleware = checkTenantPermission('tenant.wallet.view');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks access when user lacks required permission', () => {
    const req = {
      user: {
        permissions: ['tenant.reports.view']
      }
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;
    const next = vi.fn();

    const middleware = checkTenantPermission('tenant.wallet.view');
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Missing required tenant permission.' });
  });
});
