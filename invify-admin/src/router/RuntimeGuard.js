import { useRuntimeStore } from '../stores/runtime.store';
import { RouteRegistry } from '../registries/RouteRegistry';

export function registerRuntimeGuards(router) {
  router.beforeEach(async (to, from, next) => {
    // 1. Authentication Check (Handled by AuthBootstrapGuard)

    // If it's a public route or a utility/error route, just proceed
    if (
      !to.meta.requiresAuth ||
      to.path.startsWith('/error') ||
      to.path.startsWith('/suspended') ||
      to.path.startsWith('/upgrade') ||
      to.path.startsWith('/unauthorized') ||
      to.path.startsWith('/mfa/')
    ) {
      return next();
    }

    if (!localStorage.getItem('invify_token')) {
      return next();
    }

    // 2. Hydrate Runtime Config
    const runtimeStore = useRuntimeStore();
    if (!runtimeStore.isReady) {
      await runtimeStore.hydrate();
    }

    const config = runtimeStore.config;
    if (!config) {
      // Runtime config unavailable (network timeout, auth 401, etc.).
      // Degrade gracefully — allow navigation without capability/subscription gating.
      // Individual pages will handle missing config with their own fallback UI.
      console.warn('[RuntimeGuard] Runtime config unavailable — proceeding in degraded mode.');
      return next();
    }

    // Retrieve registry constraints for this route
    const routeConstraints = RouteRegistry[to.path] || RouteRegistry[to.name] || null;

    // 3. Tenant Status Check
    if (config.tenant?.status && config.tenant.status !== 'active') {
      return next('/suspended');
    }

    // If there are no specific runtime constraints for this route, proceed
    if (!routeConstraints) {
      return next();
    }

    // 4. Subscription Check
    if (routeConstraints.subscription && routeConstraints.subscription.length > 0) {
      if (!routeConstraints.subscription.includes(config.subscription?.tier)) {
        return next('/upgrade');
      }
    }

    // 5. Business Mode Check
    // Handled inherently by the WorkspaceResolver typically, but can be strictly enforced here

    // 6. Permission Check
    // In a full implementation we would intersect routeConstraints.permission with user.permissions

    // 7. Capability Check
    if (routeConstraints.capability && routeConstraints.capability.length > 0) {
      for (const cap of routeConstraints.capability) {
        if (cap === 'QUASAR' && !config.capabilities?.quasarEnabled) {
          return next('/unauthorized?reason=capability_missing');
        }
      }
    }

    // All guards passed
    next();
  });
}
