
<template>
  <component :is="activeWorkspace" />
</template>
<script setup>
import { computed } from 'vue';
import { useRuntimeStore } from '../stores/runtime.store';
import { getDashboardConfig } from '../registries/DashboardRegistry';
import { WorkspaceRegistry } from '../registries/WorkspaceRegistry';

const store = useRuntimeStore();

const activeWorkspace = computed(() => {
  const mode = store.businessMode || (typeof localStorage !== 'undefined' && localStorage.getItem('tenant_type')) || '';
  const layoutName = getDashboardConfig(mode).layout;
  return WorkspaceRegistry[layoutName];
});
</script>
