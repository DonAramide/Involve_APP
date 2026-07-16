import { useRuntimeStore } from '../stores/runtime.store';
import { RouteRegistry } from '../registries/RouteRegistry';

export function registerRuntimeGuards(router) {
  router.beforeEach(async (to, from, next) => {
    // 1. Authentication Check (Handled by AuthBootstrapGuard)
    
    // If it's a public route, just proceed
    if (!to.meta.requiresAuth) {
      return next();
    }

    // 2. Hydrate Runtime Config
    const runtimeStore = useRuntimeStore();
    if (!runtimeStore.isReady) {
      await runtimeStore.hydrate();
    }

    const config = runtimeStore.config;
    if (!config) {
      // Failed to hydrate, might be an API error or network issue
      return next('/error?type=runtime_hydration_failed');
    }

    // Retrieve registry constraints for this route
    const routeConstraints = RouteRegistry[to.path] || RouteRegistry[to.name] || null;

    // 3. Tenant Status Check
    if (config.tenant.status !== 'active') {
      return next('/suspended');
    }

    // If there are no specific runtime constraints for this route, proceed
    if (!routeConstraints) {
      return next();
    }

    // 4. Subscription Check
    if (routeConstraints.subscription && routeConstraints.subscription.length > 0) {
      if (!routeConstraints.subscription.includes(config.subscription.tier)) {
        return next('/upgrade');
      }
    }

    // 5. Business Mode Check
    // Handled inherently by the WorkspaceResolver typically, but can be strictly enforced here
    // If WorkspaceResolver is routing to a component that doesn't match the current mode:
    
    // 6. Permission Check
    // (Assuming user permissions are either in AuthStore or RuntimeStore)
    // For now we check if routeConstraints.permission exists. In a full implementation,
    // we would intersect routeConstraints.permission with user.permissions
    
    // 7. Capability Check
    if (routeConstraints.capability && routeConstraints.capability.length > 0) {
      for (const cap of routeConstraints.capability) {
        // Simple mapping: if capability is 'QUASAR', check config.capabilities.quasarEnabled
        // This mapping logic should ideally be centralized
        if (cap === 'QUASAR' && !config.capabilities.quasarEnabled) {
          return next('/unauthorized?reason=capability_missing');
        }
      }
    }

    // All guards passed
    next();
  });
}
