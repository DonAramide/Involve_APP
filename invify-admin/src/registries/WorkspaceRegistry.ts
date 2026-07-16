
import { defineAsyncComponent } from 'vue';

export const WorkspaceRegistry = {
  SchoolWorkspace: defineAsyncComponent(() => import('../components/workspaces/SchoolWorkspace.vue')),
  RetailWorkspace: defineAsyncComponent(() => import('../components/workspaces/RetailWorkspace.vue')),
  HealthcareWorkspace: defineAsyncComponent(() => import('../components/workspaces/HealthcareWorkspace.vue')),
  FallbackWorkspace: defineAsyncComponent(() => import('../components/workspaces/FallbackWorkspace.vue'))
};
