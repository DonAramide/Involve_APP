import {
  alternateOrgPrefix,
  buildInvifyCode,
  deriveBeneficiaryNine,
  deriveOrgPrefix,
  isInvifyCode,
} from '../src/modules/school-gate/school-card.identity';

describe('Invify 12-char identity codes', () => {
  test('org prefix is three alphanumeric chars', () => {
    expect(deriveOrgPrefix('John Mercy School')).toBe('JMS');
    expect(deriveOrgPrefix('test hmo')).toMatch(/^[A-Z0-9]{3}$/);
  });

  test('beneficiary nine + org yields exactly 12 chars', () => {
    const nine = deriveBeneficiaryNine('Ayo Damilola', '000123', 'student-1');
    expect(nine).toHaveLength(9);
    const code = buildInvifyCode('JMS', nine);
    expect(code).toHaveLength(12);
    expect(isInvifyCode(code)).toBe(true);
  });

  test('name change does not change suffix tied to admission+subjectId', () => {
    const a = deriveBeneficiaryNine('Ayo Dom', '0001', 'sid-1');
    const b = deriveBeneficiaryNine('Ayo Damilola Changed', '0001', 'sid-1');
    expect(a.slice(3)).toBe(b.slice(3));
  });

  test('alternate org prefixes stay length 3', () => {
    expect(alternateOrgPrefix('JMS', 1)).toMatch(/^[A-Z0-9]{3}$/);
  });
});
