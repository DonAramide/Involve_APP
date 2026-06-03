<template>
  <q-page class="q-pa-md bg-main text-main font-inter column flex-center">
    <div class="panel-card bg-panel border-muted rounded-borders q-pa-xl column items-center op-gap-16" style="max-width: 500px; text-align: center;">
      <q-icon name="construction" size="64px" color="amber-4" />
      <div class="text-h5 text-weight-bold">Module Under Development</div>
      <div class="text-muted">This feature is scheduled for deployment in a future phase.</div>
      
      <div class="bg-panel-darker q-pa-md rounded-borders full-width text-left border-muted">
        <div class="row justify-between border-bottom-light q-pb-sm q-mb-sm">
          <span class="text-muted">Expected Module:</span>
          <span class="text-weight-bold text-main">{{ formattedModule }}</span>
        </div>
        <div class="row justify-between">
          <span class="text-muted">Status:</span>
          <q-badge color="blue-4" text-color="black" label="Planned" />
        </div>
      </div>
      
      <q-btn outline color="amber-4" label="Return to Dashboard" @click="$router.push('/agent/dashboard')" class="q-mt-md" />
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const formattedModule = computed(() => {
  const mod = route.params.module || 'Unknown'
  return mod.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
})
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom-light { border-bottom: 1px solid #1a2024; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>
