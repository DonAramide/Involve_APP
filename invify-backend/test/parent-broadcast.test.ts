import { collectParentRecipients } from '../src/controllers/parent-broadcast.controller';
import { normalizeSmsPhone } from '../src/services/sms.service';

describe('parent broadcast recipients', () => {
  it('normalizes Nigerian numbers and drops invalid ones', () => {
    expect(normalizeSmsPhone('08031234567')).toBe('2348031234567');
    expect(normalizeSmsPhone('+234 803 123 4567')).toBe('2348031234567');
    expect(normalizeSmsPhone('8031234567')).toBe('2348031234567');
    expect(normalizeSmsPhone('123')).toBeNull();
  });

  it('keeps one email and one phone per parent and skips deleted rows', () => {
    const result = collectParentRecipients([
      { payload: { fullName: 'Ada', email: 'Ada@School.com', phone: '08031111111', isDeleted: false } },
      { payload: { fullName: 'Ada copy', email: 'ada@school.com', phone: '08031111111' } },
      { payload: { fullName: 'Gone', email: 'gone@school.com', phone: '08032222222', isDeleted: true } },
      { payload: { fullName: 'No contact' } },
    ]);
    expect(result.parents).toBe(3);
    expect(result.emails).toEqual(['ada@school.com']);
    expect(result.phones).toEqual(['2348031111111']);
  });
});
