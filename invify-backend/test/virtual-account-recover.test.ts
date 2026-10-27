import {
  isExistingVaError,
  last10PhoneDigits,
  pickAccountFields,
} from '../src/utils/virtual-account-recover';

describe('virtual-account-recover', () => {
  it('detects Quasar already-exists errors', () => {
    expect(
      isExistingVaError('Virtual account already exists for this student and currency'),
    ).toBe(true);
  });

  it('reads account fields from nested Quasar payloads', () => {
    expect(
      pickAccountFields({
        data: { accountNumber: '9817995040', bankName: 'Wema Bank', accountName: 'Evien Family' },
      }),
    ).toEqual({
      accountNumber: '9817995040',
      bankName: 'Wema Bank',
      accountName: 'Evien Family',
    });
  });

  it('matches Nigerian phone last 10 digits', () => {
    expect(last10PhoneDigits('+2348102393330')).toBe('8102393330');
    expect(last10PhoneDigits('08102393330')).toBe('8102393330');
  });
});
