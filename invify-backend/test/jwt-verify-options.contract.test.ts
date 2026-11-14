/**
 * JWT verify options contract (source-level).
 * Issuer/audience and device expiry are opt-in so existing production sessions stay valid
 * until JWT_ENFORCE_ISS_AUD / JWT_DEVICE_ENFORCE_EXP are attested.
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

  it('issuer/audience constraints are opt-in via JWT_EXPECTED_* or JWT_ENFORCE_ISS_AUD', () => {
    expect(jwtSrc).toMatch(/JWT_EXPECTED_ISS/);
    expect(jwtSrc).toMatch(/JWT_EXPECTED_AUD/);
    expect(jwtSrc).toMatch(/JWT_ENFORCE_ISS_AUD/);
    expect(jwtSrc).toMatch(/expectedJwtIssuer/);
    expect(jwtSrc).toMatch(/expectedJwtAudience/);
  });

  it('device-token expiry exception is gated by JWT_DEVICE_ENFORCE_EXP', () => {
    expect(jwtSrc).toMatch(/deviceId/);
    expect(jwtSrc).toMatch(/TokenExpiredError/);
    expect(jwtSrc).toMatch(/JWT_DEVICE_ENFORCE_EXP/);
    expect(jwtSrc).toMatch(/ignoreExpiration:\s*true/);
    expect(authSrc).toMatch(/deviceOwnerFromJwt/);
  });
});
