/**
 * Phase 1.1 — JWT verify options contract (source-level).
 * Documents issuer/audience and device-expiry behaviour without changing semantics.
 */
import * as fs from 'fs';
import * as path from 'path';

const jwtUtilPath = path.join(__dirname, '../src/utils/supabase-jwt.ts');
const authMwPath = path.join(__dirname, '../src/middleware/auth.middleware.ts');

describe('JWT verify options contract (source)', () => {
  const jwtSrc = fs.readFileSync(jwtUtilPath, 'utf8');
  const authSrc = fs.readFileSync(authMwPath, 'utf8');

  it('verifies tokens via jose jwtVerify and/or jsonwebtoken verify (not decode-only)', () => {
    expect(jwtSrc).toMatch(/jwtVerify/);
    expect(jwtSrc).toMatch(/jwt\.verify/);
    expect(jwtSrc).not.toMatch(/jwt\.decode\([^)]*\)\s*;?\s*$/m);
  });

  it('does not pass issuer or audience constraints to verify calls (documented MEDIUM gap)', () => {
    expect(jwtSrc).not.toMatch(/issuer\s*:/);
    expect(jwtSrc).not.toMatch(/audience\s*:/);
    expect(jwtSrc).not.toMatch(/\biss\b\s*:/);
    expect(jwtSrc).not.toMatch(/\baud\b\s*:/);
  });

  it('device-token expiry exception lives in HS verify; middleware accepts device-owner claims', () => {
    expect(jwtSrc).toMatch(/deviceId/);
    expect(jwtSrc).toMatch(/TokenExpiredError/);
    expect(jwtSrc).toMatch(/ignoreExpiration:\s*true/);
    expect(authSrc).toMatch(/deviceOwnerFromJwt/);
  });
});
