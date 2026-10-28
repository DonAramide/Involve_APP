import fs from 'fs';
import path from 'path';

describe('platform tenant and institution visibility routes', () => {
  const routes = fs.readFileSync(
    path.join(__dirname, '../src/modules/health-insurance/register-routes.ts'),
    'utf8'
  );
  const service = fs.readFileSync(
    path.join(__dirname, '../src/modules/health-insurance/services/health-platform.service.ts'),
    'utf8'
  );

  test('detail and member reads stay behind platform.integration.health', () => {
    expect(routes).toContain(
      "router.get('/platform/tenants/:tenantId', requireHealthPermission('platform.integration.health'), HealthPlatformController.getTenantDetail)"
    );
    expect(routes).toContain(
      "router.get('/platform/institutions/:institutionId', requireHealthPermission('platform.integration.health'), HealthPlatformController.getInstitutionDetail)"
    );
    expect(routes).toContain(
      "router.get('/platform/members', requireHealthPermission('platform.integration.health'), HealthPlatformController.listMembers)"
    );
  });

  test('participation still does not enrol or pay', () => {
    const method = service.slice(
      service.indexOf('static async setTenantParticipation'),
      service.indexOf('static async getProvidersHealth')
    );
    expect(method).toContain('tenant.health.activated');
    expect(method).not.toContain('hw_enrolments');
    expect(method).not.toContain('hw_payments');
  });

  test('tenant detail does not label premium collections as revenue or profit', () => {
    const method = service.slice(
      service.indexOf('static async getTenantHealthDetail'),
      service.indexOf('static async getInstitutionHealthDetail')
    );
    expect(method).toContain('premiumSnapshot');
    expect(method).not.toContain('revenue:');
    expect(method).not.toContain('profit:');
  });
});
