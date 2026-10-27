const ownerRow: { data: any } = { data: { id: 'owner-1', email: 'owner@school.ng' } };

jest.mock('../src/db/supabase', () => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    limit: () => chain,
    maybeSingle: async () => ownerRow,
  };
  return { supabase: {}, supabaseAdmin: { from: () => chain } };
});

import jwt from 'jsonwebtoken';
import { signLinkedDeviceToken } from '../src/controllers/onboarding.controller';

const SECRET = 'test-device-secret-0123456789';

describe('signLinkedDeviceToken', () => {
  const prev = process.env.JWT_SECRET;
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    ownerRow.data = { id: 'owner-1', email: 'owner@school.ng' };
  });
  afterAll(() => {
    process.env.JWT_SECRET = prev;
  });

  it('signs a non-expiring owner device token for the tenant', async () => {
    const token = await signLinkedDeviceToken('tenant-1', 'R52M20L8ZDZ');
    const payload = jwt.verify(token!, SECRET) as jwt.JwtPayload;
    expect(payload).toMatchObject({
      sub: 'owner-1',
      role: 'owner',
      tenantId: 'tenant-1',
      deviceId: 'R52M20L8ZDZ',
    });
    expect(payload.exp).toBeUndefined();
  });

  it('falls back to a random subject when the tenant has no owner row', async () => {
    ownerRow.data = null;
    const token = await signLinkedDeviceToken('tenant-1', 'DEV1');
    const payload = jwt.verify(token!, SECRET) as jwt.JwtPayload;
    expect(payload.sub).toBeTruthy();
    expect(payload.sub).not.toBe('owner-1');
    expect(payload.tenantId).toBe('tenant-1');
  });

  it('returns null when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET;
    expect(await signLinkedDeviceToken('tenant-1', 'DEV1')).toBeNull();
  });
});
