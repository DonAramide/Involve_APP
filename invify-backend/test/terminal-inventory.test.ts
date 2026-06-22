import request from 'supertest';
import app from '../src/app';
import { supabase } from '../src/db/supabase';

jest.mock('../src/db/supabase', () => {
  const mockFrom = jest.fn();
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: jest.fn()
      }
    }
  };
});

describe('P0-4 Terminal Inventory Migration & Integration Suite', () => {
  const mockFrom = supabase.from as jest.Mock;
  const mockGetUser = supabase.auth.getUser as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OFFLINE_MOCK_AUTH = 'false';
  });

  // Test 1: Sync service pairings mapping
  describe('Pairings mapping in sync service', () => {
    test('Should return flat terminal inventory mapped to correct sync payload', async () => {
      const mockDevice = {
        device_id: 'dev-123',
        device_category: 'COMPANY_DEVICE',
        device_role: 'TABLET',
        tenant_id: 'tenant-abc',
        tenants: {
          id: 'tenant-abc',
          name: 'Tenant ABC',
          plan: 'premium',
          type: 'retail'
        }
      };

      const mockTerminalAssignment = {
        terminal_id: 'TID-999',
        mpos_terminal_id: 'MPOS-999',
        pos_serial_number: 'SN-999',
        terminal_type: 'N3',
        printer_mac_address: 'AA:BB:CC:DD:EE:FF',
        printer_model: 'XP-80',
        assigned_device_id: 'dev-123',
        assignment_status: 'assigned'
      };

      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-user', email: 'admin@example.com' } },
        error: null
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'admin-user', role: 'admin', tenant_id: 'tenant-abc', is_active: true }, error: null }) }) }) };
        }
        if (table === 'devices') {
          return { select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: mockDevice, error: null }) }) }) };
        }
        if (table === 'terminal_inventory') {
          return { select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: mockTerminalAssignment, error: null }) }) }) };
        }
        if (table === 'terminal_audit_log') {
          return { insert: () => ({ select: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'audit-1' }, error: null }) }) }) };
        }
        if (table === 'system_configurations') {
          return { select: () => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [], error: null }), in: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post('/api/mobile/terminal/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({ deviceId: 'dev-123' });

      expect(res.status).toBe(200);
      expect(res.body.terminalId).toBe('TID-999');
      expect(res.body.mposTerminalId).toBe('MPOS-999');
      expect(res.body.posSerialNumber).toBe('SN-999');
      expect(res.body.printerMac).toBe('AA:BB:CC:DD:EE:FF');
      expect(res.body.printerModel).toBe('XP-80');
    });
  });

  // Test 2: Active assignment and unassignment checks on Supabase
  describe('Active assignment/unassignment via Admin Portal', () => {
    test('Should execute assign and unassign via Supabase', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-user', email: 'admin@example.com' } },
        error: null
      });

      const mockTerminal = {
        id: 'inv-1',
        terminal_id: 'TID-123',
        mpos_terminal_id: 'MPOS-123',
        assignment_status: 'unassigned',
        config_version: 1
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'admin-user', role: 'admin', is_active: true }, error: null }) }) }) };
        }
        if (table === 'terminal_inventory') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: jest.fn().mockImplementation((col) => {
                  return { data: mockTerminal, error: null };
                })
              })
            }),
            update: () => ({
              or: () => ({
                select: () => ({
                  single: jest.fn().mockResolvedValue({ data: { ...mockTerminal, assignment_status: 'assigned' }, error: null })
                })
              }),
              eq: () => ({
                select: () => ({
                  single: jest.fn().mockResolvedValue({ data: { ...mockTerminal, assignment_status: 'unassigned' }, error: null })
                })
              })
            })
          };
        }
        if (table === 'terminal_audit_log') {
          return { insert: () => ({ select: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'audit-1' }, error: null }) }) }) };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis(), single: jest.fn().mockReturnThis() };
      });

      const assignRes = await request(app)
        .post('/api/admin/inventory/assign')
        .set('Authorization', 'Bearer admin-token')
        .send({ tenantId: 'tenant-123', serialNumber: 'SN-123' });

      expect(assignRes.status).toBe(200);

      const unassignRes = await request(app)
        .post('/api/admin/inventory/assignments/inv-1/unassign')
        .set('Authorization', 'Bearer admin-token');

      expect(unassignRes.status).toBe(200);
    });
  });

  // Test 3: Global Search results extraction
  describe('Global Search results extraction', () => {
    test('Should search terminal_inventory and tenants via Supabase', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-user', email: 'admin@example.com' } },
        error: null
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'admin-user', role: 'admin', is_active: true }, error: null }) }) }) };
        }
        if (table === 'terminal_inventory') {
          return {
            select: () => ({
              or: () => ({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { terminal_id: 'TID-SEARCH', terminal_type: 'N3' }
                  ],
                  error: null
                })
              })
            })
          };
        }
        if (table === 'tenants') {
          return {
            select: () => ({
              or: () => ({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { id: 'tenant-search', name: 'Search Tenant Corp', type: 'retail', status: 'active' }
                  ],
                  error: null
                })
              })
            })
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .get('/api/search')
        .set('Authorization', 'Bearer token')
        .query({ q: 'Search' });

      expect(res.status).toBe(200);
      expect(res.body.results.some((r: any) => r.type === 'TERMINAL' && r.title.includes('TID-SEARCH'))).toBe(true);
      expect(res.body.results.some((r: any) => r.type === 'TENANT' && r.title.includes('Search Tenant Corp'))).toBe(true);
    });
  });

  // Test 4: POS affected devices lookup
  describe('POS affected devices lookup', () => {
    test('Should query terminal_inventory and devices to locate affected devices', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-user', email: 'admin@example.com' } },
        error: null
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'admin-user', role: 'super_admin', is_active: true }, error: null }) }) }) };
        }
        if (table === 'terminal_inventory') {
          return {
            select: () => ({
              eq: () => ({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { terminal_id: 'TID-1', mpos_terminal_id: 'MPOS-1', terminal_type: 'N3', assigned_device_id: 'dev-1' }
                  ],
                  error: null
                })
              })
            })
          };
        }
        if (table === 'devices') {
          return {
            select: () => ({
              in: jest.fn().mockResolvedValue({
                data: [
                  { device_id: 'dev-1', device_name: 'POS Tablet A', device_info: { model: 'T1000' } }
                ],
                error: null
              })
            })
          };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .get('/admin/pos/routing/affected-devices')
        .set('Authorization', 'Bearer token')
        .query({ scopeType: 'Tenant', targetValue: 'tenant-123' });

      expect(res.status).toBe(200);
      expect(res.body[0].tabletModel).toBe('T1000');
      expect(res.body[0].mposSerial).toBe('MPOS-1');
      expect(res.body[0].terminalId).toBe('TID-1');
    });
  });

  // Test 5: Outage fault tolerance (503 retryable behavior)
  describe('Database outage timeout tolerance', () => {
    test('Should return 503 retryable response when query fails with timeout error', async () => {
      setupAuth();

      const timeoutError = new Error('fetch failed');
      (timeoutError as any).code = 'UND_ERR_CONNECT_TIMEOUT';

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'admin-user', role: 'admin', is_active: true }, error: null }) }) }) };
        }
        if (table === 'devices') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: jest.fn().mockRejectedValue(timeoutError)
              })
            })
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const res = await request(app)
        .get('/api/mobile/terminal/status')
        .set('Authorization', 'Bearer token')
        .query({ deviceId: 'dev-123' });

      expect(res.status).toBe(503);
      expect(res.body.retryable).toBe(true);
      expect(res.body.error).toContain('Database unavailable');
    });
  });

  function setupAuth() {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-user', email: 'admin@example.com' } },
      error: null
    });
  }
});
