import { resolveIncomingPinHash } from '../src/controllers/staff.controller';

const HASH = 'a'.repeat(64);

describe('resolveIncomingPinHash', () => {
  it('keeps a portal-locked pin', () => {
    expect(resolveIncomingPinHash({ pinHash: 'b'.repeat(64) }, HASH, true)).toBe(HASH);
  });

  it('stores a device hash when the portal has none', () => {
    expect(resolveIncomingPinHash({ pinHash: HASH.toUpperCase() }, null, false)).toBe(HASH);
  });

  it('ignores a raw pin and keeps the existing hash', () => {
    expect(resolveIncomingPinHash({ pin: '1234' }, HASH, false)).toBe(HASH);
  });

  it('returns null when nothing usable was sent', () => {
    expect(resolveIncomingPinHash({}, null, false)).toBeNull();
  });
});
