<template>
  <div class="row q-col-gutter-lg">
    <div 
      v-for="widget in resolvedWidgets" 
      :key="widget.id"
      :class="widget.col"
      :style="{ order: widget.order }"
    >
      <component :is="widget.component" />
    </div>
    <div v-if="resolvedWidgets.length === 0" class="col-12 text-center text-grey-5 q-pa-xl">
      <q-icon name="visibility_off" size="xl" class="q-mb-md opacity-50" />
      <div class="text-h6 text-weight-bold">No Widgets Available</div>
      <div class="text-caption">You do not have the required capabilities or permissions to view this dashboard.</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRuntimeStore } from '../stores/runtime.store';
import { getDashboardConfig } from '../registries/DashboardRegistry';
import { WidgetRegistry } from '../registries/WidgetRegistry';

const store = useRuntimeStore();

const resolvedWidgets = computed(() => {
  const mode = store.businessMode || (typeof localStorage !== 'undefined' && localStorage.getItem('tenant_type')) || '';
  const dashboardConfig = getDashboardConfig(mode);
  
  if (!dashboardConfig.grid) return [];

  const widgetsToRender = [];

  for (const gridItem of dashboardConfig.grid) {
    const widgetMeta = WidgetRegistry[gridItem.id];
    if (!widgetMeta) continue;

    // Evaluate permissions
    if (widgetMeta.permissions && widgetMeta.permissions.length > 0) {
      const hasPerm = widgetMeta.permissions.some(p => store.hasPermission(p));
      if (!hasPerm) continue; // Skip rendering
    }

    // Evaluate capabilities
    if (widgetMeta.capabilities && widgetMeta.capabilities.length > 0) {
      const hasCap = widgetMeta.capabilities.every(c => store.hasCapability(c));
      if (!hasCap) continue;
    }

    widgetsToRender.push({
      ...widgetMeta,
      col: gridItem.col || 'col-12',
      order: gridItem.order || 99
    });
  }

  // Sort by defined order
  return widgetsToRender.sort((a, b) => a.order - b.order);
});
</script>
