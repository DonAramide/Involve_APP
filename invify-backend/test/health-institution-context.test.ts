import {
  claimStatusBucket,
  describeInstitutions,
  memberDisplayName,
  pickPrimaryInstitution,
  premiumSnapshot,
  providerTenantCounts,
  recordedInstitutionCode,
  rememberProviderTenant,
  summariseClaims,
  tenantOnboardingCodes
} from '../src/modules/health-insurance/services/health-institution-context';

describe('health institution context', () => {
  test('does not invent an institution when no recorded link exists', () => {
    const described = describeInstitutions([]);
    expect(described.unresolved).toBe(true);
    expect(described.institutionName).toBe('Not linked');
    expect(described.institutionCode).toBeNull();
    expect(described.resolution).toBe('unlinked');
  });

  test('prefers an active HEALTH_INSURANCE registry row over an agent code', () => {
    const primary = pickPrimaryInstitution([
      { id: 'a1', code: 'AAA000', name: 'Invify default', mode: 'AGGREGATOR', source: 'agent_code' },
      {
        id: 'i1',
        code: 'MHMO1',
        name: 'Leadway',
        mode: 'HMO',
        source: 'tenant_institution_relationships',
        serviceType: 'HEALTH_INSURANCE',
        relationshipStatus: 'ACTIVE'
      }
    ]);
    expect(primary?.code).toBe('MHMO1');
    expect(primary?.name).toBe('Leadway');
  });

  test('uses the assigned HMO organisation when the tenant is linked to a provider', () => {
    const primary = pickPrimaryInstitution([
      { id: 'p1', code: '3op0kk', name: 'LeadwayTest Agent HMO', mode: 'HMO', source: 'hw_providers' },
      { id: 'a1', code: 'AAA000', name: 'Invify default', mode: 'AGGREGATOR', source: 'agent_code' }
    ]);
    expect(primary?.code).toBe('3op0kk');
    expect(primary?.name).toBe('LeadwayTest Agent HMO');
    expect(describeInstitutions([primary!]).institutionName).toBe('LeadwayTest Agent HMO');
  });

  test('counts unique tenants per HMO without inventing extra rows', () => {
    const map = new Map<string, Set<string>>();
    rememberProviderTenant(map, 'p1', 't1');
    rememberProviderTenant(map, 'p1', 't1');
    rememberProviderTenant(map, 'p1', 't2');
    rememberProviderTenant(map, 'p2', 't3');
    rememberProviderTenant(map, '', 't4');
    expect(providerTenantCounts(map).get('p1')).toBe(2);
    expect(providerTenantCounts(map).get('p2')).toBe(1);
    expect(providerTenantCounts(map).has('')).toBe(false);
  });

  test('uses the onboarding tenant code when no relationship row exists', () => {
    const primary = pickPrimaryInstitution([
      { id: 'i-hmo', code: '3op0kk', name: 'Test HMO institute', mode: 'HMO', source: 'tenant_code' }
    ]);
    expect(primary?.code).toBe('3op0kk');
    expect(recordedInstitutionCode(describeInstitutions([primary!]), { tenant_code: '3op0kk' })).toBe('3op0kk');
    expect(recordedInstitutionCode(describeInstitutions([]), { tenant_code: '3op0kk', agent_code: 'AAA000' })).toBe('3op0kk');
    expect(tenantOnboardingCodes({ tenant_code: '3op0kk', agent_code: '3op0kk' })).toEqual(['3op0kk']);
  });

  test('shows extra institution count without merging guessed names', () => {
    const described = describeInstitutions([
      {
        id: 'i1',
        code: 'MHMO1',
        name: 'Leadway',
        mode: 'HMO',
        source: 'tenant_institution_relationships',
        serviceType: 'HEALTH_INSURANCE',
        relationshipStatus: 'ACTIVE'
      },
      { id: 'a1', code: 'BNK1', name: 'Bank A', mode: 'BANK', source: 'agent_code' }
    ]);
    expect(described.institutionName).toBe('Leadway (+1 more)');
    expect(described.institutionName).not.toContain('ARAMIDE');
  });

  test('member display name falls back instead of using the tenant name', () => {
    expect(memberDisplayName({ students: null, hw_staff_profiles: null })).toBe('Name not recorded');
    expect(memberDisplayName({ students: { first_name: 'Ada', last_name: 'Okeke' } })).toBe('Ada Okeke');
  });

  test('claim paid is not derived from authorised amounts', () => {
    const summary = summariseClaims([
      { status: 'approved', authorised_amount_minor: 5000, record_type: 'claim' },
      { status: 'settled', authorised_amount_minor: 2000, record_type: 'claim' }
    ]);
    expect(summary.approved).toBe(1);
    expect(summary.settled).toBe(1);
    expect(summary.paid).toBeNull();
    expect(claimStatusBucket('under_review')).toBe('pending');
  });

  test('premium snapshot keeps collections off the revenue field', () => {
    const snap = premiumSnapshot(
      [{ status: 'issued', amount_due_minor: 1000, amount_paid_minor: 0 }],
      [{ status: 'successful', amount_minor: 400 }]
    );
    expect(snap.billedMinor).toBe(1000);
    expect(snap.collectedMinor).toBe(400);
    expect(snap.outstandingMinor).toBe(1000);
    expect(snap.recognisedRevenueMinor).toBeNull();
    expect(snap.profitMinor).toBeNull();
  });
});
