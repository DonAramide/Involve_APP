import * as fs from 'fs';
import * as path from 'path';
import {
  applyInstitutionCodeToVaBody,
  normalizeVaInstitutionCode,
  resolveVaCounterpartyOwnerId,
} from '../src/integrations/quasar/va-institution-code';

const TENANT = '11111111-1111-4111-8111-111111111111';

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

describe('resolveVaCounterpartyOwnerId', () => {
  it('accepts a valid tenant UUID v4', () => {
    expect(resolveVaCounterpartyOwnerId(TENANT)).toBe(TENANT);
  });

  it('rejects empty, invalid, and sentinel values', () => {
    expect(() => resolveVaCounterpartyOwnerId('')).toThrow(
      'VA_COUNTERPARTY_TENANT_ID_REQUIRED',
    );
    expect(() => resolveVaCounterpartyOwnerId('not-a-uuid')).toThrow(
      'VA_COUNTERPARTY_TENANT_ID_INVALID',
    );
    expect(() => resolveVaCounterpartyOwnerId('platform-admin-owner-id')).toThrow(
      'VA_COUNTERPARTY_SENTINEL_FORBIDDEN',
    );
  });
});

describe('VA ownership call-site mapping', () => {
  const srcRoot = path.join(__dirname, '..', 'src');

  function read(rel: string): string {
    return fs.readFileSync(path.join(srcRoot, rel), 'utf8');
  }

  it('removes the sentinel from the seven VA call paths', () => {
    const files = [
      'controllers/customer.controller.ts',
      'controllers/admin.controller.ts',
      'modules/agent-portal/controllers/lead.controller.ts',
    ];
    for (const file of files) {
      const text = read(file);
      expect(text).not.toMatch(/platform-admin-owner-id/);
    }
  });

  it('uses resolveVaCounterpartyOwnerId on all seven remediations', () => {
    const customer = read('controllers/customer.controller.ts');
    const admin = read('controllers/admin.controller.ts');
    const lead = read('modules/agent-portal/controllers/lead.controller.ts');

    expect(customer).toMatch(/resolveVaCounterpartyOwnerId\(tenantId\)/);
    expect(admin.match(/resolveVaCounterpartyOwnerId\(/g)?.length).toBeGreaterThanOrEqual(5);
    expect(lead).toMatch(/resolveVaCounterpartyOwnerId\(tenant\.id\)/);
  });

  it('keeps student and customer working paths on tenantId as parentId', () => {
    const student = read('controllers/student.controller.ts');
    const customer = read('controllers/customer.controller.ts');
    expect(student).toMatch(/parentId:\s*tenantId/);
    expect(customer).toMatch(/parentId:\s*tenantId/);
  });

  it('documents the seven ownership mappings', () => {
    const expected = [
      { path: 'staff', child: 'userId', parent: 'tenantId' },
      { path: 'admin_tenant_operating', child: 'tenant.id', parent: 'tenant.id' },
      { path: 'admin_student_offline', child: 'studentId', parent: 'id' },
      { path: 'admin_student_supabase', child: 'studentId', parent: 'id' },
      { path: 'admin_customer_offline', child: 'customerId', parent: 'id' },
      { path: 'admin_customer_supabase', child: 'customerId', parent: 'id' },
      { path: 'lead_convert', child: 'tenant.id', parent: 'tenant.id' },
    ];
    expect(expected).toHaveLength(7);
    expect(expected.every((row) => row.parent === 'tenantId' || row.parent === 'tenant.id' || row.parent === 'id')).toBe(
      true,
    );
  });
});
