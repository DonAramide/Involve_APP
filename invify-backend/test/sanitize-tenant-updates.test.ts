import {
  isMissingTenantColumnError,
  normalizeTenantType,
  sanitizeTenantUpdates,
  withoutOptionalTenantColumns,
} from '../src/utils/sanitize-tenant-updates';

describe('sanitizeTenantUpdates', () => {
  test('keeps only admin-editable columns and drops list-row extras', () => {
    const updates = sanitizeTenantUpdates({
      name: 'Heritage High',
      type: 'service',
      plan: 'Trial',
      plan_expires_at: '2026-09-11T23:59:59.000Z',
      status: 'Active',
      support_phone: '+234800',
      device_registrations: [{ device_id: 'abc' }],
      device_id: 'abc',
      device_count: 2,
      tenantId: 'should-not-pass',
      id: '7283871f-fd5f-4d53-8da8-fa5f6c49cc2c',
    });

    expect(updates).toEqual({
      name: 'Heritage High',
      type: 'services',
      plan: 'trial',
      plan_expires_at: '2026-09-11T23:59:59.000Z',
      status: 'active',
      support_phone: '+234800',
    });
  });

  test('blank expiry becomes null (permanent)', () => {
    expect(sanitizeTenantUpdates({ plan_expires_at: '' }).plan_expires_at).toBeNull();
    expect(sanitizeTenantUpdates({ plan_expires_at: null }).plan_expires_at).toBeNull();
  });
});

describe('normalizeTenantType', () => {
  test('maps service aliases to services', () => {
    expect(normalizeTenantType('service')).toBe('services');
    expect(normalizeTenantType('Services')).toBe('services');
    expect(normalizeTenantType('invify_services')).toBe('services');
  });
});

describe('missing plan_expires_at column', () => {
  const schemaError = {
    code: 'PGRST204',
    message: "Could not find the 'plan_expires_at' column of 'tenants' in the schema cache",
  };

  test('detects PostgREST schema-cache misses', () => {
    expect(isMissingTenantColumnError(schemaError, 'plan_expires_at')).toBe(true);
    expect(isMissingTenantColumnError({ message: 'duplicate key' }, 'plan_expires_at')).toBe(false);
  });

  test('retries without the missing optional column', () => {
    const retried = withoutOptionalTenantColumns(
      { name: 'Heritage High', plan_expires_at: '2026-09-11T23:59:59.000Z' },
      schemaError,
    );
    expect(retried).toEqual({ name: 'Heritage High' });
  });
});
