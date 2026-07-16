
<template>
  <component :is="activeWorkspace" />
</template>
<script setup>
import { computed } from 'vue';
import { useRuntimeStore } from '../stores/runtime.store';
import { DashboardRegistry } from '../registries/DashboardRegistry';
import { WorkspaceRegistry } from '../registries/WorkspaceRegistry';

const store = useRuntimeStore();

const activeWorkspace = computed(() => {
  const mode = store.config?.businessMode || 'school';
  const layoutName = DashboardRegistry[mode]?.layout || 'FallbackWorkspace';
  return WorkspaceRegistry[layoutName];
});
</script>
