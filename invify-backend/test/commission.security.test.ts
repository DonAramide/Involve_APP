import request from 'supertest';
import app from '../src/app';

describe('Commission Security & Hardening Audit (PRG-1A)', () => {
  beforeAll(() => {
    process.env.BUILD_VARIANT = 'LOCAL';
    process.env.OFFLINE_LOCAL_AUTH = 'false';
    require('../src/config/build-variant').BuildVariantService.resetInstance();
  });

  const writeRoutes = [
    { method: 'post', path: '/admin/commissions/approvals/some-id/approve' },
    { method: 'post', path: '/admin/commissions/approvals/some-id/reject' },
    { method: 'post', path: '/admin/commissions/clawback' },
    { method: 'post', path: '/admin/commissions/simulate' },
    { method: 'post', path: '/admin/commissions/programs' },
    { method: 'put', path: '/admin/commissions/programs/some-id' },
    { method: 'post', path: '/admin/commissions/programs/some-id/versions' },
    { method: 'post', path: '/admin/commissions/versions/some-id/clone' },
    { method: 'post', path: '/admin/commissions/versions/some-id/activate' },
    { method: 'put', path: '/admin/commissions/versions/some-id/rules' },
    { method: 'post', path: '/admin/commissions/category-rules' },
    { method: 'put', path: '/admin/commissions/category-rules/some-id' },
    { method: 'delete', path: '/admin/commissions/category-rules/some-id' },
    { method: 'post', path: '/admin/commissions/performance-rules' },
    { method: 'put', path: '/admin/commissions/performance-rules/some-id' },
    { method: 'delete', path: '/admin/commissions/performance-rules/some-id' },
    { method: 'post', path: '/admin/commissions/terminal-rules' },
    { method: 'put', path: '/admin/commissions/terminal-rules/some-id' },
    { method: 'delete', path: '/admin/commissions/terminal-rules/some-id' }
  ];

  describe('1. Unauthorized requests (Non-admin roles) must be rejected with 403', () => {
    writeRoutes.forEach(({ method, path }) => {
      test(`${method.toUpperCase()} ${path} with mock-agent-token returns 403 Forbidden`, async () => {
        // mock-agent-token-xyz sets req.user.role to 'AGENT' which is unauthorized for commission writes
        const res = await (request(app) as any)[method](path)
          .set('Authorization', 'Bearer mock-agent-token-test-agent');
        
        expect(res.status).toBe(403);
        expect(res.body.error).toContain('Forbidden');
      });
    });
  });

  describe('2. mock-admin-token cannot be used in staging or production builds', () => {
    let originalEnv: string | undefined;
    let originalMockAuth: string | undefined;

    beforeAll(() => {
      originalEnv = process.env.BUILD_VARIANT;
      originalMockAuth = process.env.OFFLINE_MOCK_AUTH;
      process.env.OFFLINE_MOCK_AUTH = 'true';
    });

    afterAll(() => {
      process.env.BUILD_VARIANT = originalEnv;
      process.env.OFFLINE_MOCK_AUTH = originalMockAuth;
      require('../src/config/build-variant').BuildVariantService.resetInstance();
    });

    test('mock-admin-token works in test/development environments (LOCAL variant)', async () => {
      process.env.BUILD_VARIANT = 'LOCAL';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      const res = await request(app)
        .post('/admin/commissions/programs')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ name: 'Test Program', description: 'Test' });

      // In LOCAL variant, it allows the mock token bypass.
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    test('mock-admin-token is strictly rejected with 401 in PROD builds', async () => {
      process.env.BUILD_VARIANT = 'PROD';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      const res = await request(app)
        .post('/admin/commissions/programs')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ name: 'Production Test Program', description: 'Test' });

      // In PROD/STAGING, mock-admin-token is not processed as a bypass,
      // and it fails JWT check by Supabase, yielding 401.
      expect(res.status).toBe(401);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error.length).toBeGreaterThan(0);
    });

    test('mock-admin-token is strictly rejected with 401 in STAGING builds', async () => {
      process.env.BUILD_VARIANT = 'STAGING';
      require('../src/config/build-variant').BuildVariantService.resetInstance();
      const res = await request(app)
        .post('/admin/commissions/programs')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ name: 'Staging Test Program', description: 'Test' });

      expect(res.status).toBe(401);
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error.length).toBeGreaterThan(0);
    });
  });
});
