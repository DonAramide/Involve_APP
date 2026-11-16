import { collectCustomerRecipients } from '../src/controllers/customer-broadcast.controller';
import { normalizeSmsPhone } from '../src/services/sms.service';

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
});
