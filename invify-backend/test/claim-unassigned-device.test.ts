import { supabaseAdmin } from '../src/db/supabase';
import { claimUnassignedDeviceForTenant } from '../src/utils/claim-unassigned-device';

jest.mock('../src/db/supabase', () => {
  const mockFrom = jest.fn();
  const client = { from: mockFrom };
  return { supabase: client, supabaseAdmin: client };
});

describe('claimUnassignedDeviceForTenant', () => {
  const mockFrom = supabaseAdmin.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('overrides a null/UNASSIGNED registration with the tablet serial', async () => {
    const updated: any[] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'device_registrations') {
        return {
          select: () => ({
            eq: (_col: string, value: string) => {
              if (value === 'R52M20L8ZDZ') {
                return { maybeSingle: async () => ({ data: null, error: null }) };
              }
              return Promise.resolve({
                data: [{ id: 'row-1', device_id: null, device_number: 1, tenant_id: 'tenant-1' }],
                error: null,
              });
            },
          }),
          update: (patch: any) => {
            updated.push(patch);
            return { eq: async () => ({ error: null }) };
          },
          insert: async () => ({ error: null }),
        };
      }
      if (table === 'tenants') {
        return { update: () => ({ eq: async () => ({ error: null }) }) };
      }
      if (table === 'devices') {
        return { upsert: async () => ({ error: null }) };
      }
      return {};
    });

    const result = await claimUnassignedDeviceForTenant({
      tenantId: 'tenant-1',
      deviceId: 'R52M20L8ZDZ',
      ownerEmail: 'invify51@gmail.com',
    });

    expect(result.bound).toBe(true);
    expect(result.overrodeUnassigned).toBe(true);
    expect(updated[0].device_id).toBe('R52M20L8ZDZ');
  });

  test('does not steal a tenant that already has a different usable device', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'device_registrations') {
        return {
          select: () => ({
            eq: async () => ({
              data: [{ id: 'row-1', device_id: 'R52MOTHERDEV', device_number: 1, tenant_id: 'tenant-1' }],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    const result = await claimUnassignedDeviceForTenant({
      tenantId: 'tenant-1',
      deviceId: 'R52M20L8ZDZ',
    });

    expect(result.bound).toBe(false);
    expect(result.overrodeUnassigned).toBe(false);
  });

  test('inserts device #1 when the web tenant has no registration row', async () => {
    const inserted: any[] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'device_registrations') {
        return {
          select: () => ({
            eq: (_col: string, value: string) => {
              if (value === 'R52M20L8ZDZ') {
                return { maybeSingle: async () => ({ data: null, error: null }) };
              }
              return Promise.resolve({ data: [], error: null });
            },
          }),
          insert: async (row: any) => {
            inserted.push(row);
            return { error: null };
          },
        };
      }
      if (table === 'tenants') {
        return { update: () => ({ eq: async () => ({ error: null }) }) };
      }
      if (table === 'devices') {
        return { upsert: async () => ({ error: null }) };
      }
      return {};
    });

    const result = await claimUnassignedDeviceForTenant({
      tenantId: 'tenant-1',
      deviceId: 'R52M20L8ZDZ',
    });

    expect(result.bound).toBe(true);
    expect(result.overrodeUnassigned).toBe(true);
    expect(inserted[0]).toMatchObject({ device_id: 'R52M20L8ZDZ', device_number: 1 });
  });
});
