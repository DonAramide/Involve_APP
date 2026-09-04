import { hydrateTenantOwnerContact } from '../src/utils/owner-contact';

describe('hydrateTenantOwnerContact', () => {
  test('fills missing owner email from the users row', () => {
    const tenant = hydrateTenantOwnerContact(
      { name: 'REVEREND PARISH', phone: '+2349124161287', settings: {} },
      [{ role: 'owner', email: 'parish@example.com', name: 'Parish Owner' }],
      [],
    );
    expect(tenant.settings.owner_profile.email).toBe('parish@example.com');
    expect(tenant.owner_email).toBe('parish@example.com');
  });

  test('fills missing owner email from device registration', () => {
    const tenant = hydrateTenantOwnerContact(
      { name: 'REVEREND PARISH', settings: { owner_profile: { phone: '+2349124161287' } } },
      [],
      [{ ownerEmail: 'device-owner@invify.app' }],
    );
    expect(tenant.settings.owner_profile.email).toBe('device-owner@invify.app');
  });
});
