import {
  assertInvifyMasterOwnership,
  assertStatusTransition,
  bankSubscriptionReference,
  canTransitionCatalogueStatus,
  clientSafeCatalogueError,
  rejectAaa000Owner,
  requireCatalogueCode,
  sanitizeCatalogueSearch
} from '../src/modules/health-insurance/services/invify-catalogue.rules';

describe('Invify catalogue ownership rules', () => {
  test('rejects AAA000 as a catalogue owner', () => {
    expect(() => rejectAaa000Owner({ tenantCode: 'AAA000' })).toThrow(/not a verified Invify HMO catalogue owner/);
    expect(() => rejectAaa000Owner({ agentCode: 'aaa000' })).toThrow(/not a verified/);
    expect(() => rejectAaa000Owner({ institutionCode: 'MHMO' })).not.toThrow();
  });

  test('invify_master cannot be bound to a provider or tenant', () => {
    expect(() => assertInvifyMasterOwnership({ ownership_scope: 'invify_master', owner_provider_id: null })).not.toThrow();
    expect(() => assertInvifyMasterOwnership({
      ownership_scope: 'invify_master',
      owner_provider_id: '11111111-1111-1111-1111-111111111111'
    })).toThrow(/cannot be owned by an HMO provider/);
    expect(() => assertInvifyMasterOwnership({
      ownership_scope: 'hmo_provider',
      owner_provider_id: null
    })).toThrow(/invify_master/);
  });

  test('publication lifecycle does not allow retired to reopen', () => {
    expect(canTransitionCatalogueStatus('draft', 'published')).toBe(true);
    expect(canTransitionCatalogueStatus('published', 'suspended')).toBe(true);
    expect(canTransitionCatalogueStatus('suspended', 'published')).toBe(true);
    expect(canTransitionCatalogueStatus('retired', 'published')).toBe(false);
    expect(() => assertStatusTransition('retired', 'draft')).toThrow();
  });

  test('bank subscription references master ids without implying an override write', () => {
    const ref = bankSubscriptionReference({
      offeringId: 'off-1',
      productId: 'prod-1',
      planVersionId: 'ver-1'
    });
    expect(ref.masterOfferingId).toBe('off-1');
    expect(ref.overrideStorage).toMatch(/must not UPDATE hw_catalogue_/);
  });

  test('offering codes stay in the existing plan-code alphabet', () => {
    expect(requireCatalogueCode('INV-OUTPATIENT', 'Offering code')).toBe('INV-OUTPATIENT');
    expect(() => requireCatalogueCode('x', 'Offering code')).toThrow();
  });

  test('search sanitizer strips PostgREST or-filter metacharacters', () => {
    expect(sanitizeCatalogueSearch('out,patient(code)')).toBe('outpatientcode');
    expect(sanitizeCatalogueSearch('a%b_c\\d')).toBe('abcd');
  });

  test('client errors do not echo postgres internals', () => {
    const schema = clientSafeCatalogueError({ message: 'relation public.hw_catalogue_offerings does not exist' }, 'Failed');
    expect(schema.code).toBe('CATALOGUE_SCHEMA_UNAPPLIED');
    expect(schema.status).toBe(503);
    expect(schema.message).not.toMatch(/relation public/);
    const missingFn = clientSafeCatalogueError(
      { code: '42883', message: 'Could not find the function public.hw_catalogue_apply_mutation' },
      'Failed'
    );
    expect(missingFn.code).toBe('CATALOGUE_SCHEMA_UNAPPLIED');
    const other = clientSafeCatalogueError({ message: 'permission denied for table hw_catalogue_offerings' }, 'Failed to list offerings');
    expect(other.message).toBe('Failed to list offerings');
    expect(other.message).not.toMatch(/permission denied/);
  });
});
