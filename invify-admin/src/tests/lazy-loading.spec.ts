import { describe, it, expect } from 'vitest';
import routes from '../router/routes';

describe('Lazy Loading Validation', () => {
  it('verifies that tenant domain components are lazy-loaded', () => {
    const tenantRoute = routes.find(r => r.path === '/tenant');
    expect(tenantRoute).toBeDefined();

    const children = tenantRoute?.children || [];
    
    children.forEach(child => {
      // Check if component is a function returning a Promise (dynamic import)
      if (child.component) {
        expect(typeof child.component).toBe('function');
      }
    });
  });
});
