import * as bcrypt from 'bcrypt';
import { OTPService } from '../src/services/otp.service';
import { OTPController } from '../src/controllers/otp.controller';
import { supabase } from '../src/db/supabase';

// Mock supabase client
jest.mock('../src/db/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('OTP Brute-Force Protection & Security Hardening', () => {
  let mockStore: Map<string, any>;

  beforeEach(() => {
    mockStore = new Map();
    jest.clearAllMocks();

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table !== 'verification_codes') {
        throw new Error('Unexpected table ' + table);
      }

      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(function (this: any, col: string, val: any) {
          this.filters = this.filters || {};
          this.filters[col] = val;
          return this;
        }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockImplementation(function (this: any) {
          const phone = this.filters?.phone;
          const used = this.filters?.used;
          const record = mockStore.get(phone);
          if (record && (used === undefined || record.used === used)) {
            return Promise.resolve({ data: { ...record }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        upsert: jest.fn().mockImplementation((payload: any) => {
          mockStore.set(payload.phone, { id: 'uuid-' + payload.phone, ...payload });
          return Promise.resolve({ data: null, error: null });
        }),
        insert: jest.fn().mockImplementation((payload: any) => {
          mockStore.set(payload.phone, { id: 'uuid-' + payload.phone, ...payload });
          return Promise.resolve({ data: null, error: null });
        }),
        update: jest.fn().mockImplementation(function (this: any, patch: any) {
          return {
            eq: jest.fn().mockImplementation((col: string, val: any) => {
              for (const [k, rec] of mockStore.entries()) {
                if (rec.id === val || (col === 'phone' && k === val)) {
                  mockStore.set(k, { ...rec, ...patch });
                }
              }
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }),
      };
    });
  });

  test('generateOTP stores a bcrypt hash, not plaintext, with attempt_count 0 and used=false', async () => {
    const phone = '+2348011112222';
    const rawOtp = await OTPService.generateOTP(phone);

    expect(rawOtp).toMatch(/^\d{6}$/);
    const stored = mockStore.get(phone);
    expect(stored).toBeDefined();
    expect(stored.code).not.toBe(rawOtp);
    expect(stored.code.startsWith('$2b$10$')).toBe(true);
    expect(stored.attempt_count).toBe(0);
    expect(stored.used).toBe(false);
    expect(stored.status).toBe('PENDING');

    const isValid = await bcrypt.compare(rawOtp, stored.code);
    expect(isValid).toBe(true);
  });

  test('valid OTP succeeds, marks record as used and status VERIFIED', async () => {
    const phone = '+2348022223333';
    const rawOtp = await OTPService.generateOTP(phone);

    const result = await OTPService.verifyOTPDetailed(phone, rawOtp);
    expect(result.ok).toBe(true);

    const stored = mockStore.get(phone);
    expect(stored.used).toBe(true);
    expect(stored.status).toBe('VERIFIED');
    expect(stored.verified_at).toBeDefined();

    // Secondary verify fails because used=true
    const replay = await OTPService.verifyOTPDetailed(phone, rawOtp);
    expect(replay.ok).toBe(false);
  });

  test('invalid code increments attempt_count', async () => {
    const phone = '+2348033334444';
    await OTPService.generateOTP(phone);

    const res1 = await OTPService.verifyOTPDetailed(phone, '000000');
    expect(res1.ok).toBe(false);
    expect(res1.locked).toBeUndefined();

    const stored = mockStore.get(phone);
    expect(stored.attempt_count).toBe(1);
  });

  test('5 failed attempts triggers lockout and marks status CANCELLED', async () => {
    const phone = '+2348044445555';
    const correctCode = await OTPService.generateOTP(phone);

    // 4 failed attempts
    for (let i = 1; i <= 4; i++) {
      const res = await OTPService.verifyOTPDetailed(phone, '00000' + i);
      expect(res.ok).toBe(false);
      expect(res.locked).toBeUndefined();
      expect(mockStore.get(phone).attempt_count).toBe(i);
    }

    // 5th failed attempt -> locks out
    const fifth = await OTPService.verifyOTPDetailed(phone, '999999');
    expect(fifth.ok).toBe(false);
    expect(fifth.locked).toBe(true);
    expect(fifth.error).toContain('Too many failed attempts');

    const stored = mockStore.get(phone);
    expect(stored.used).toBe(true);
    expect(stored.status).toBe('CANCELLED');

    // Even with the correct code now, verification fails
    const lockedTry = await OTPService.verifyOTPDetailed(phone, correctCode);
    expect(lockedTry.ok).toBe(false);
  });

  test('expired OTP fails verification and is marked EXPIRED', async () => {
    const phone = '+2348055556666';
    const code = '123456';
    const hash = await bcrypt.hash(code, 10);
    mockStore.set(phone, {
      id: 'uuid-expired',
      phone,
      code: hash,
      expires_at: new Date(Date.now() - 60000).toISOString(), // 1 minute in the past
      used: false,
      attempt_count: 0,
    });

    const res = await OTPService.verifyOTPDetailed(phone, code);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('expired');

    const stored = mockStore.get(phone);
    expect(stored.used).toBe(true);
    expect(stored.status).toBe('EXPIRED');
  });

  test('lockout on phone A does not impact phone B', async () => {
    const phoneA = '+2348066667777';
    const phoneB = '+2348077778888';

    await OTPService.generateOTP(phoneA);
    const codeB = await OTPService.generateOTP(phoneB);

    // Lock out phone A with 5 invalid attempts
    for (let i = 0; i < 5; i++) {
      await OTPService.verifyOTPDetailed(phoneA, '111111');
    }

    expect(mockStore.get(phoneA).status).toBe('CANCELLED');

    // Phone B should verify normally
    const resB = await OTPService.verifyOTPDetailed(phoneB, codeB);
    expect(resB.ok).toBe(true);
    expect(mockStore.get(phoneB).status).toBe('VERIFIED');
  });

  test('OTPController.verifyOTP returns 429 when locked out and 200 on success', async () => {
    const phone = '+2348099990000';
    const code = await OTPService.generateOTP(phone);

    // Lock it out
    for (let i = 0; i < 4; i++) {
      await OTPService.verifyOTPDetailed(phone, '000000');
    }

    // Controller mock req/res for 5th attempt (triggers 429)
    const reqLocked: any = { body: { phone, code: '000000' } };
    const resLocked: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await OTPController.verifyOTP(reqLocked, resLocked);
    expect(resLocked.status).toHaveBeenCalledWith(429);
    expect(resLocked.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Too many failed attempts') })
    );

    // Now test success path on fresh phone
    const phoneGood = '+2348099991111';
    const codeGood = await OTPService.generateOTP(phoneGood);
    const reqGood: any = { body: { phone: phoneGood, code: codeGood } };
    const resGood: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await OTPController.verifyOTP(reqGood, resGood);
    expect(resGood.status).toHaveBeenCalledWith(200);
    expect(resGood.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});
