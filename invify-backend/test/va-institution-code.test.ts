import {
  applyInstitutionCodeToVaBody,
  normalizeVaInstitutionCode,
} from '../src/integrations/quasar/va-institution-code';

describe('Invify virtual-account institution code', () => {
  it('normalizes a canonical code and rejects identifiers that are not codes', () => {
    expect(normalizeVaInstitutionCode('prov01')).toBe('PROV01');
    expect(normalizeVaInstitutionCode('ab')).toBeNull();
    expect(normalizeVaInstitutionCode(null)).toBeNull();
    expect(
      normalizeVaInstitutionCode('550e8400-e29b-41d4-a716-446655440000'),
    ).toBeNull();
  });

  it('J: sends institution_code without replacing the wallet owner', () => {
    const body: Record<string, unknown> = {
      merchantWalletOwnerId: '550e8400-e29b-41d4-a716-446655440000',
      currency: 'NGN',
      email: 'a@b.c',
      firstName: 'Ada',
      lastName: 'Lovelace',
      metadata: { type: 'student_account', source: 'school_student_provisioning' },
    };
    applyInstitutionCodeToVaBody(body, 'bank-a');
    expect(body.institutionCode).toBe('BANK-A');
    expect(body.institution_code).toBe('BANK-A');
    expect(body.institutionCode).not.toBe(body.merchantWalletOwnerId);
    expect(body.metadata).toMatchObject({ type: 'student_account' });
  });

  it('omits the field when the tenant has no institution code', () => {
    const body: Record<string, unknown> = {
      merchantWalletOwnerId: 'owner',
      currency: 'NGN',
    };
    applyInstitutionCodeToVaBody(body, null);
    expect(body).not.toHaveProperty('institutionCode');
    expect(body).not.toHaveProperty('institution_code');
  });
});
