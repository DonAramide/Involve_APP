<template>
  <q-page class="q-pa-lg text-white relative-position" style="background: #05070d; min-height: 100vh;">
    <div class="ambient-glow" style="background: radial-gradient(circle, rgba(99,102,241, 0.08) 0%, rgba(5,7,13,0) 70%);" />
    <InvifyLoadingState v-if="showLoading" message="LOADING YOUR DASHBOARD..." />
    <div v-else-if="store.error" class="column items-center justify-center q-pa-xl text-center" style="min-height: 50vh;">
      <div class="text-negative text-weight-bold q-mb-sm">Could not load your dashboard</div>
      <div class="text-grey-5 text-caption q-mb-md">{{ store.error }}</div>
      <q-btn unelevated color="indigo-7" label="Retry" @click="store.refresh()" />
    </div>
    <WorkspaceResolver v-else />
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import WorkspaceResolver from '../../../../components/WorkspaceResolver.vue';
import InvifyLoadingState from '../../../../components/InvifyLoadingState.vue';
import { useRuntimeStore } from '../../../../stores/runtime.store';

const store = useRuntimeStore();
const showLoading = computed(() => store.isLoading || (!store.isReady && !store.error));

if (!store.isReady && !store.isLoading) {
  store.hydrate();
}

onMounted(async () => {
  if (!store.isReady && !store.isLoading) {
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
