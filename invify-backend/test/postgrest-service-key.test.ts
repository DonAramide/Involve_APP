import { mintLegacyServiceRoleJwt, resolvePostgrestServiceKey } from '../src/db/postgrest-service-key';
import jwt from 'jsonwebtoken';

describe('postgrest service key', () => {
  it('mints a service_role JWT for sb_secret keys so inserts are not blocked by RLS', () => {
    const secret = 'x'.repeat(32);
    const key = resolvePostgrestServiceKey('sb_secret_test-key', secret);
    expect(key).not.toBe('sb_secret_test-key');
    const payload = jwt.verify(key, secret) as jwt.JwtPayload;
    expect(payload.role).toBe('service_role');
    expect(payload.iss).toBe('supabase');
  });

  it('leaves legacy JWT service keys unchanged', () => {
    const legacy = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy';
    expect(resolvePostgrestServiceKey(legacy, 'x'.repeat(32))).toBe(legacy);
  });

  it('mintLegacyServiceRoleJwt signs HS256', () => {
    const token = mintLegacyServiceRoleJwt('y'.repeat(32));
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('privilegedAdminCreateClientArgs', () => {
  const { privilegedAdminCreateClientArgs } = require('../src/db/postgrest-service-key');

  it('uses sb_secret as apikey and minted JWT only as Authorization', () => {
    const sb = 'sb_secret_test-key';
    const jwtSecret = 'z'.repeat(32);
    const { apiKey, options } = privilegedAdminCreateClientArgs(sb, jwtSecret);
    expect(apiKey).toBe(sb);
    expect(apiKey.startsWith('sb_secret_')).toBe(true);
    const auth = options.global?.headers?.Authorization || '';
    expect(auth.startsWith('Bearer ')).toBe(true);
    const token = auth.slice('Bearer '.length);
    expect(token.split('.')).toHaveLength(3);
    expect(apiKey).not.toBe(token);
    const payload = jwt.decode(token) as jwt.JwtPayload;
    expect(payload.role).toBe('service_role');
    expect(payload.iss).toBe('supabase');
  });

  it('does not mint when JWT secret is missing', () => {
    const sb = 'sb_secret_test-key';
    const { apiKey, options } = privilegedAdminCreateClientArgs(sb, '');
    expect(apiKey).toBe(sb);
    expect(options.global).toBeUndefined();
  });

  it('leaves production-style JWT service keys as the createClient credential', () => {
    const legacy = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy.sig';
    const { apiKey, options } = privilegedAdminCreateClientArgs(legacy, 'x'.repeat(32));
    expect(apiKey).toBe(legacy);
    expect(options.global).toBeUndefined();
  });
});
