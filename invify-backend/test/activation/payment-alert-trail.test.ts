import { nextPaymentAlertDelayMs, tenantSocketCount } from '../../src/services/payment-alert-trail.service';

describe('payment alert retry', () => {
  it('retries every 6 seconds until the device acknowledges', () => {
    expect(nextPaymentAlertDelayMs(0)).toBe(6_000);
    expect(nextPaymentAlertDelayMs(1)).toBe(6_000);
    expect(nextPaymentAlertDelayMs(9)).toBe(6_000);
  });

  it('counts sockets in the tenant room only', () => {
    const io = {
      sockets: {
        adapter: {
          rooms: new Map([
            ['tenant:school-1', new Set(['a', 'b'])],
            ['all', new Set(['a'])],
          ]),
        },
      },
    };
    expect(tenantSocketCount(io, 'school-1')).toBe(2);
    expect(tenantSocketCount(io, 'missing')).toBe(0);
  });
});
