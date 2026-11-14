import jwt from 'jsonwebtoken';

const SECRET = 'test-supabase-jwt-secret-32ch!!';

function loadJwtUtil() {
  jest.resetModules();
  return require('../src/utils/supabase-jwt') as typeof import('../src/utils/supabase-jwt');
}

describe('JWT issuer/audience and device expiry', () => {
  const prev = {
    iss: process.env.JWT_EXPECTED_ISS,
    aud: process.env.JWT_EXPECTED_AUD,
    enforce: process.env.JWT_ENFORCE_ISS_AUD,
    deviceExp: process.env.JWT_DEVICE_ENFORCE_EXP,
    secret: process.env.SUPABASE_JWT_SECRET,
    url: process.env.SUPABASE_URL,
  };

  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    delete process.env.JWT_EXPECTED_ISS;
    delete process.env.JWT_EXPECTED_AUD;
    delete process.env.JWT_ENFORCE_ISS_AUD;
    delete process.env.JWT_DEVICE_ENFORCE_EXP;
    delete process.env.SUPABASE_URL;
  });

  afterAll(() => {
    process.env.JWT_EXPECTED_ISS = prev.iss;
    process.env.JWT_EXPECTED_AUD = prev.aud;
    process.env.JWT_ENFORCE_ISS_AUD = prev.enforce;
    process.env.JWT_DEVICE_ENFORCE_EXP = prev.deviceExp;
    process.env.SUPABASE_JWT_SECRET = prev.secret;
    process.env.SUPABASE_URL = prev.url;
  });

  test('expired non-device token is rejected', async () => {
    const { verifySupabaseAccessToken } = loadJwtUtil();
    const token = jwt.sign({ sub: 'user-1', email: 'a@b.c' }, SECRET, { expiresIn: '-60s' });
    await expect(verifySupabaseAccessToken(token)).rejects.toMatchObject({ status: 401 });
  });

  test('expired device token is accepted by default (production session continuity)', async () => {
    const { verifySupabaseAccessToken } = loadJwtUtil();
    const token = jwt.sign(
      { sub: 'device-owner', email: 'owner@t.example', deviceId: 'TAB-1', tenantId: 'tenant-a', role: 'owner' },
      SECRET,
      { expiresIn: '-60s' },
    );
    const payload = await verifySupabaseAccessToken(token);
    expect((payload as any).deviceId).toBe('TAB-1');
  });

  test('expired device token is rejected when JWT_DEVICE_ENFORCE_EXP=true', async () => {
    process.env.JWT_DEVICE_ENFORCE_EXP = 'true';
    const { verifySupabaseAccessToken } = loadJwtUtil();
    const token = jwt.sign(
      { sub: 'device-owner', deviceId: 'TAB-1' },
      SECRET,
      { expiresIn: '-60s' },
    );
    await expect(verifySupabaseAccessToken(token)).rejects.toMatchObject({ status: 401 });
  });

  test('wrong issuer is accepted until JWT_ENFORCE_ISS_AUD is enabled', async () => {
    const { verifySupabaseAccessToken } = loadJwtUtil();
    const token = jwt.sign({ sub: 'user-1' }, SECRET, { issuer: 'https://evil.example/auth/v1', expiresIn: '5m' });
    const payload = await verifySupabaseAccessToken(token);
    expect((payload as any).sub).toBe('user-1');
  });

  test('wrong issuer is rejected when JWT_EXPECTED_ISS is set', async () => {
    process.env.JWT_EXPECTED_ISS = 'https://rpcjelhacmkhzguljdgi.supabase.co/auth/v1';
    const { verifySupabaseAccessToken } = loadJwtUtil();
    const token = jwt.sign({ sub: 'user-1' }, SECRET, { issuer: 'https://evil.example/auth/v1', expiresIn: '5m' });
    await expect(verifySupabaseAccessToken(token)).rejects.toMatchObject({ status: 401 });
  });

  test('matching issuer and audience are accepted when enforced', async () => {
    process.env.JWT_EXPECTED_ISS = 'https://rpcjelhacmkhzguljdgi.supabase.co/auth/v1';
    process.env.JWT_EXPECTED_AUD = 'authenticated';
    const { verifySupabaseAccessToken } = loadJwtUtil();
    const token = jwt.sign(
      { sub: 'user-1' },
      SECRET,
      {
        issuer: 'https://rpcjelhacmkhzguljdgi.supabase.co/auth/v1',
        audience: 'authenticated',
        expiresIn: '5m',
      },
    );
    const payload = await verifySupabaseAccessToken(token);
    expect((payload as any).sub).toBe('user-1');
  });

  test('wrong audience is rejected when JWT_EXPECTED_AUD is set', async () => {
    process.env.JWT_EXPECTED_AUD = 'authenticated';
    const { verifySupabaseAccessToken } = loadJwtUtil();
    const token = jwt.sign({ sub: 'user-1' }, SECRET, { audience: 'anon', expiresIn: '5m' });
    await expect(verifySupabaseAccessToken(token)).rejects.toMatchObject({ status: 401 });
  });
});
