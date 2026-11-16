import { collectCustomerRecipients } from '../src/controllers/customer-broadcast.controller';
import { normalizeSmsPhone } from '../src/services/sms.service';
import * as fs from 'fs';
import * as path from 'path';

describe('customer broadcast recipients', () => {
  it('normalizes Nigerian numbers and drops invalid ones', () => {
    expect(normalizeSmsPhone('08031234567')).toBe('2348031234567');
    expect(normalizeSmsPhone('+234 803 123 4567')).toBe('2348031234567');
    expect(normalizeSmsPhone('123')).toBeNull();
  });

  it('keeps one email and one phone per customer and skips inactive rows', () => {
    const result = collectCustomerRecipients([
      { name: 'Ada', email: 'Ada@Shop.com', phone: '08031111111', status: 'ACTIVE' },
      { name: 'Ada copy', email: 'ada@shop.com', phone: '08031111111', status: 'ACTIVE' },
      { name: 'Gone', email: 'gone@shop.com', phone: '08032222222', status: 'INACTIVE' },
      { name: 'Archived', email: 'old@shop.com', phone: '08033333333', status: 'ARCHIVED' },
      { name: 'No contact' },
    ]);
    // Named rows without contact still count toward the audience total (same as parent broadcast).
    expect(result.customers).toBe(3);
    expect(result.emails).toEqual(['ada@shop.com']);
    expect(result.phones).toEqual(['2348031111111']);
  });

  it('treats missing status as ACTIVE (staging schema has no customers.status column)', () => {
    const result = collectCustomerRecipients([
      { name: 'With email', email: 'buyer@shop.com', phone: '08034444444' },
      { name: 'Phone only', phone: '08035555555' },
      { name: 'Name only' },
      null,
      {},
    ]);
    expect(result.customers).toBe(3);
    expect(result.emails).toEqual(['buyer@shop.com']);
    expect(result.phones).toEqual(['2348034444444', '2348035555555']);
  });

  it('returns empty audience for empty input; invalid contacts count customer but yield no recipients', () => {
    expect(collectCustomerRecipients([])).toEqual({ customers: 0, emails: [], phones: [] });
    // Row has contact fields present so it counts, but invalid email/phone are dropped from recipient lists.
    expect(collectCustomerRecipients([{ email: 'bad', phone: '12' }])).toEqual({
      customers: 1,
      emails: [],
      phones: [],
    });
  });

  it('loadCustomers select omits non-existent customers.status column', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/controllers/customer-broadcast.controller.ts'),
      'utf8',
    );
    expect(src).toMatch(/\.select\(\s*['"]id,\s*name,\s*email,\s*phone['"]\s*\)/);
    expect(src).not.toMatch(/\.select\(\s*['"]id,\s*name,\s*email,\s*phone,\s*status['"]\s*\)/);
    expect(src).toMatch(/row\.status\s*\|\|\s*['"]ACTIVE['"]/);
  });
});
