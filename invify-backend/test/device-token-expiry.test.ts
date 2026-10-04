import jwt from 'jsonwebtoken';
import { verifyWithSharedSecrets } from '../src/utils/supabase-jwt';

const SECRET = 'test-device-secret-0123456789';
const expiredExp = () => Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 90;

describe('device token expiry', () => {
  it('accepts an expired device token (deviceId claim)', () => {
    const token = jwt.sign(
      { sub: 'u1', tenantId: 't1', deviceId: 'dev-1', exp: expiredExp() },
      SECRET,
    );
    const payload = verifyWithSharedSecrets(token, [SECRET]);
    expect(payload.deviceId).toBe('dev-1');
  });

  it('accepts a device token with no exp', () => {
    const token = jwt.sign({ sub: 'u1', deviceId: 'dev-1' }, SECRET);
    expect(verifyWithSharedSecrets(token, [SECRET]).sub).toBe('u1');
  });

  it('still rejects expired non-device tokens', () => {
    const token = jwt.sign({ sub: 'u1', exp: expiredExp() }, SECRET);
    expect(() => verifyWithSharedSecrets(token, [SECRET])).toThrow('Invalid or expired token');
  });

  it('still rejects expired device tokens with a bad signature', () => {
    const token = jwt.sign(
      { sub: 'u1', deviceId: 'dev-1', exp: expiredExp() },
      'some-other-secret-0123456789',
    );
    expect(() => verifyWithSharedSecrets(token, [SECRET])).toThrow('Invalid or expired token');
  });
});
