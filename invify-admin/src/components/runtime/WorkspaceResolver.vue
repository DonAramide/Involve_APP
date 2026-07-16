<template>
  <div class="workspace-resolver">
    <div v-if="runtimeStore.isLoading" class="workspace-loading">
      Initializing Enterprise Workspace...
    </div>
    <div v-else-if="runtimeStore.error" class="workspace-error">
      Failed to load workspace configuration.
    </div>
    <div v-else-if="runtimeStore.isReady">
      <!-- In a real implementation, we would dynamically load a specific workspace based on businessMode -->
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRuntimeStore } from '../../stores/runtime.store';

const runtimeStore = useRuntimeStore();

onMounted(async () => {
  await runtimeStore.hydrate();
});
</script>

<style scoped>
.workspace-resolver {
  width: 100%;
  height: 100%;
}
.workspace-loading, .workspace-error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.2rem;
  color: #fff;
}
.workspace-error {
  color: #ff4d4f;
}
</style>
