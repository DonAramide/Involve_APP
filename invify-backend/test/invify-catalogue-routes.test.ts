import fs from 'fs';
import path from 'path';

describe('Invify catalogue platform routes', () => {
  const routes = fs.readFileSync(
    path.join(__dirname, '../src/modules/health-insurance/register-routes.ts'),
    'utf8'
  );
  const service = fs.readFileSync(
    path.join(__dirname, '../src/modules/health-insurance/services/invify-catalogue.service.ts'),
    'utf8'
  );
  const portal = fs.readFileSync(
    path.join(__dirname, '../src/modules/health-insurance/register-routes.ts'),
    'utf8'
  );

  test('catalogue mutations require platform.plans.manage and are not tenant health.plans.manage', () => {
    expect(routes).toContain(
      "router.post('/platform/catalogue/offerings', requireHealthPermission('platform.plans.manage'), HealthPlatformController.createCatalogueOffering)"
    );
    expect(routes).toContain(
      "router.post('/platform/catalogue/offerings/:offeringId/status', requireHealthPermission('platform.plans.manage'), HealthPlatformController.setCatalogueOfferingStatus)"
    );
    const start = routes.indexOf("router.get('/platform/catalogue/offerings'")
    const end = routes.indexOf('// ─── Tenant Endpoints')
    const catalogueBlock = routes.slice(start, end)
    expect(catalogueBlock).toContain("requireHealthPermission('platform.plans.manage')")
    expect(catalogueBlock).not.toContain("requireHealthPermission('health.plans.manage')")
  });

  test('HMO portal plan routes are unchanged and separate from Invify catalogue paths', () => {
    expect(portal).toContain("hmoRouter.post('/plans', requireHmoInstitution('hmo.plans.manage'), HmoPortalController.createOrVersionPlan)");
    expect(portal).not.toContain("hmoRouter.post('/catalogue/offerings'");
  });

  test('catalogue service does not enrol, invoice, pay, or rewrite tenant plans', () => {
    expect(service).not.toContain("from('hw_enrolments')");
    expect(service).not.toContain("from('hw_payments')");
    expect(service).not.toContain("from('hw_premium_invoices')");
    expect(service).not.toContain("from('hw_plans').update");
    expect(service).not.toContain("from('hw_plan_versions').update");
    expect(service).not.toContain('FEATURE_REAL_MONEY_PAYOUTS');
    expect(service).toContain("ownership_scope: 'invify_master'");
    expect(service).toContain('rejectAaa000Owner');
    expect(service).toContain('hw_catalogue_apply_mutation');
    expect(service).not.toMatch(/from\('hw_catalogue_\w+'\)[\s\S]{0,80}\.(insert|update|delete)\(/);
    expect(service).not.toContain('hw_audit_events');
    expect(service).not.toContain('PLATFORM_AUDIT_TENANT');
    expect(service).toContain('loadProductOffering');
    expect(service.slice(service.indexOf('static async removeFacility'))).toContain('loadProductOffering');
  });

  test('tenant, bank, and HMO portal routers do not expose catalogue mutations', () => {
    const tenantBlock = routes.slice(routes.indexOf('// ─── Tenant Endpoints'));
    expect(tenantBlock).not.toContain('/catalogue/');
    expect(routes).not.toContain("hmoRouter.post('/catalogue");
    expect(routes).not.toContain(
      "requireHealthPermission('health.plans.manage'), HealthPlatformController.createCatalogueOffering"
    );
  });
});
