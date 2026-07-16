<template>
  <q-page class="q-pa-lg text-white relative-position" style="background: #05070d; min-height: 100vh;">
    <!-- Ambient Sleek Stripe-Style Background Glows -->
    <div class="ambient-glow" style="background: radial-gradient(circle, rgba(99,102,241, 0.08) 0%, rgba(5,7,13,0) 70%);" />
    
    <WorkspaceResolver />
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue';
import WorkspaceResolver from '../../../../components/WorkspaceResolver.vue';
import { useRuntimeStore } from '../../../../stores/runtime.store';

const store = useRuntimeStore();

onMounted(async () => {
  // Trigger hydration if not already done by router guard
  if (!store.hydrated) {
    await store.hydrate();
  }
});
</script>

<style scoped>
.ambient-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 400px;
  pointer-events: none;
  z-index: 1;
  transition: background 0.8s ease;
}
</style>
