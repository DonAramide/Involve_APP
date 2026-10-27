import {
  buildDeviceLinkQrPayload,
  createDeviceLinkToken,
  DEVICE_LINK_TTL_MS,
  WEB_ISSUER_DEVICE_ID,
} from '../src/utils/device-link-qr';

describe('device link QR payload', () => {
  test('is a LINK_DEVICE JSON blob the tablet scanner can parse', () => {
    const expiresAt = new Date('2026-09-08T14:00:00.000Z');
    const raw = buildDeviceLinkQrPayload({
      token: 'abc123',
      tenantId: 'tenant-1',
      businessName: 'DON PARISH',
      industry: 'school',
      expiresAt,
    });
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({
      action: 'LINK_DEVICE',
      token: 'abc123',
      tenantId: 'tenant-1',
      businessName: 'DON PARISH',
      industry: 'school',
      expiresAt: '2026-09-08T14:00:00.000Z',
    });
  });

  test('issues a 3-minute token', () => {
    const now = Date.parse('2026-09-08T13:00:00.000Z');
    const { token, expiresAt } = createDeviceLinkToken(now);
    expect(token).toHaveLength(32);
    expect(expiresAt.toISOString()).toBe('2026-09-08T13:03:00.000Z');
    expect(DEVICE_LINK_TTL_MS).toBe(180000);
    expect(WEB_ISSUER_DEVICE_ID).toBe('WEB-PORTAL');
  });
});
