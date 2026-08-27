import request from 'supertest';

describe('MFA endpoint rate limiting', () => {
  test('repeated MFA requests are rate limited', async () => {
    process.env.RATE_LIMIT_AUTH_MAX = '1';
    process.env.RATE_LIMIT_AUTH_WINDOW_MS = '60000';
    jest.resetModules();
    const app = require('../src/app').default;

    const first = await request(app).post('/api/auth/mfa/setup').send({});
    expect(first.status).toBe(401);

    const second = await request(app).post('/api/auth/mfa/setup').send({});
    expect(second.status).toBe(429);

    // Invalid payload proves the existing email OTP handler remains routed without sending an OTP.
    const emailOtp = await request(app).post('/api/auth/send-email-otp').send({});
    expect(emailOtp.status).not.toBe(404);
    expect(emailOtp.status).not.toBe(429);
  });
});
