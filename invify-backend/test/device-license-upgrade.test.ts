import { DeviceController } from '../src/controllers/device.controller';
import { supabaseAdmin } from '../src/db/supabase';

jest.mock('../src/db/supabase', () => {
  const mockFrom = jest.fn();
  const client = { from: mockFrom };
  return { supabase: client, supabaseAdmin: client };
});

jest.mock('../src/services/gov-audit.service', () => ({
  GovAuditService: { logAction: jest.fn() },
}));

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.body = body;
      return this;
    },
  };
  return res;
}

describe('validateCode upgrades tenant plan', () => {
  const mockFrom = supabaseAdmin.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Standard redemption writes plan=standard and plan_expires_at on the tenant', async () => {
    const pendingActivation = {
      activation_code: 'NLDQ-D3QB-6X63-YVZ5-YQNE-R5XE',
      tenant_id: 'tenant-123',
      is_used: false,
      status: 'pending',
      plan_index: 1,
      duration_days: 30,
      device_suffix: '0',
      expires_at: '2026-10-08T01:00:00.000Z',
    };
    let capturedTenantUpdate: any = null;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'device_activations') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: pendingActivation, error: null }) }) }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  gt: () => ({
                    select: () => ({
                      maybeSingle: jest.fn().mockResolvedValue({ data: pendingActivation, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'terminal_inventory') {
        return { select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) };
      }
      if (table === 'devices') {
        return {
          upsert: () => ({ select: () => ({ single: jest.fn().mockResolvedValue({ data: { device_id: 'R52M413KTQK' }, error: null }) }) }),
        };
      }
      if (table === 'device_registrations') {
        return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
      }
      if (table === 'tenants') {
        return {
          update: (row: any) => {
            capturedTenantUpdate = row;
            return {
              eq: () => ({
                select: () => ({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: 'tenant-123', name: 'DON PARISH', plan: row.plan, plan_expires_at: row.plan_expires_at },
                    error: null,
                  }),
                }),
              }),
            };
          },
        };
      }
      return { select: jest.fn().mockReturnThis() };
    });

    const req: any = {
      body: { code: pendingActivation.activation_code, deviceId: 'R52M413KTQK' },
      user: { role: 'owner', tenantId: 'tenant-123' },
    };
    const res = mockRes();
    await DeviceController.validateCode(req, res);

    expect(res.statusCode).toBe(200);
    expect(capturedTenantUpdate).toEqual({
      plan: 'standard',
      plan_expires_at: '2026-10-08T01:00:00.000Z',
    });
    expect(res.body.plan).toBe('standard');
    expect(res.body.tenant.plan).toBe('standard');
  });

  test('same-device re-validate still upgrades a tenant stuck on trial', async () => {
    const usedHere = {
      activation_code: 'USED-HERE',
      tenant_id: 'tenant-123',
      is_used: true,
      status: 'used',
      device_id: 'R52M413KTQK',
      plan_index: 1,
      duration_days: 30,
      expires_at: '2026-10-08T01:00:00.000Z',
    };
    let capturedTenantUpdate: any = null;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'device_activations') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: usedHere, error: null }) }) }),
        };
      }
      if (table === 'terminal_inventory') {
        return { select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) };
      }
      if (table === 'devices') {
        return {
          upsert: () => ({ select: () => ({ single: jest.fn().mockResolvedValue({ data: { device_id: 'R52M413KTQK' }, error: null }) }) }),
        };
      }
      if (table === 'device_registrations') {
        return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
      }
      if (table === 'tenants') {
        return {
          update: (row: any) => {
            capturedTenantUpdate = row;
            return {
              eq: () => ({
                select: () => ({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: 'tenant-123', plan: row.plan, plan_expires_at: row.plan_expires_at },
                    error: null,
                  }),
                }),
              }),
            };
          },
        };
      }
      return { select: jest.fn().mockReturnThis() };
    });

    const req: any = {
      body: { code: 'USED-HERE', deviceId: 'R52M413KTQK' },
      user: { role: 'owner', tenantId: 'tenant-123' },
    };
    const res = mockRes();
    await DeviceController.validateCode(req, res);

    expect(res.statusCode).toBe(200);
    expect(capturedTenantUpdate.plan).toBe('standard');
    expect(res.body.plan).toBe('standard');
  });
});
