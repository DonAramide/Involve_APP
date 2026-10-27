
import { defineAsyncComponent } from 'vue';
import InvifyLoadingState from '../components/InvifyLoadingState.vue';

const lazyWorkspace = (loader) => defineAsyncComponent({
  loader,
  loadingComponent: InvifyLoadingState,
  delay: 0,
});

export const WorkspaceRegistry = {
  SchoolWorkspace: lazyWorkspace(() => import('../components/workspaces/SchoolWorkspace.vue')),
  RetailWorkspace: lazyWorkspace(() => import('../components/workspaces/RetailWorkspace.vue')),
  ServicesWorkspace: lazyWorkspace(() => import('../components/workspaces/ServicesWorkspace.vue')),
  HealthcareWorkspace: lazyWorkspace(() => import('../components/workspaces/HealthcareWorkspace.vue')),
  FallbackWorkspace: lazyWorkspace(() => import('../components/workspaces/FallbackWorkspace.vue'))
};
