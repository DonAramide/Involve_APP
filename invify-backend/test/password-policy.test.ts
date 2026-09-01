import { evaluatePasswordPolicy, PASSWORD_MIN_LENGTH } from '../src/utils/password-policy';

describe('password policy', () => {
  test('rejects short passwords', () => {
    const result = evaluatePasswordPolicy('Ab1!shor');
    expect(result.ok).toBe(false);
    expect(result.checks.minLength).toBe(false);
    expect(PASSWORD_MIN_LENGTH).toBe(9);
  });

  test('rejects missing character classes', () => {
    const result = evaluatePasswordPolicy('alllowercase12!');
    expect(result.checks.uppercase).toBe(false);
    expect(result.ok).toBe(false);
  });

  test('rejects common and leetspeak weak words', () => {
    expect(evaluatePasswordPolicy('Passw0rd!2345').checks.notWeak).toBe(false);
    expect(evaluatePasswordPolicy('Welcome@2026xx').checks.notWeak).toBe(false);
  });

  test('rejects repeated and sequential patterns', () => {
    expect(evaluatePasswordPolicy('AaaAaaAaa1!x').checks.notRepeated).toBe(false);
    expect(evaluatePasswordPolicy('Abcabcabc1!x').checks.notRepeated).toBe(false);
    expect(evaluatePasswordPolicy('MyPass1234!xx').checks.notRepeated).toBe(false);
  });

  test('rejects the current / default password', () => {
    const result = evaluatePasswordPolicy('Str0ng-Harbor#9', {
      currentPassword: 'Str0ng-Harbor#9',
    });
    expect(result.checks.notCurrent).toBe(false);
    expect(result.ok).toBe(false);
  });

  test('accepts a strong unique password', () => {
    const result = evaluatePasswordPolicy('Harbor#Maple92!', {
      email: 'operator@example.com',
      currentPassword: 'Invify@Temp99',
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
