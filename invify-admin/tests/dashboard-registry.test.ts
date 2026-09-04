import { getDashboardConfig, resolveDashboardMode } from '../src/registries/DashboardRegistry';

describe('DashboardRegistry services workspace', () => {
  test('aliases service / hospitality / invify_services to services', () => {
    expect(resolveDashboardMode('service')).toBe('services');
    expect(resolveDashboardMode('Services')).toBe('services');
    expect(resolveDashboardMode('invify_services')).toBe('services');
    expect(resolveDashboardMode('hospitality')).toBe('services');
  });

  test('services grid includes held-with-platform and withdrawable wallet tiles', () => {
    const config = getDashboardConfig('services');
    expect(config.layout).toBe('ServicesWorkspace');
    const ids = config.grid.map((item) => item.id);
    expect(ids).toContain('PlatformHeldWidget');
    expect(ids).toContain('WalletWidget');
    expect(ids).toContain('SalesSummaryWidget');
    expect(ids).toContain('ServiceJobsWidget');
  });

  test('unknown mode still falls back to an empty grid', () => {
    const config = getDashboardConfig('logistics');
    expect(config.layout).toBe('FallbackWorkspace');
    expect(config.grid).toEqual([]);
  });
});
