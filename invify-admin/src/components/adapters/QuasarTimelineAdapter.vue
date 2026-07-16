<template>
  <q-card class="bg-card-dark border-grey-9 relative-position column h-full" style="min-height: 250px;">
    <!-- Loading State -->
    <q-inner-loading :showing="status === 'loading'" class="bg-black-transparent">
      <q-spinner-dots size="40px" color="amber-4" />
    </q-inner-loading>

    <!-- Error State -->
    <div v-if="status === 'error'" class="flex flex-center h-full q-pa-md text-center">
      <div>
        <q-icon name="error_outline" color="red-4" size="md" />
        <div class="text-caption text-red-4 q-mt-xs">{{ errorMessage }}</div>
        <q-btn flat dense size="sm" color="grey-5" label="Retry" class="q-mt-sm" @click="fetchData(true)" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="status === 'empty'" class="flex flex-center h-full q-pa-md text-center">
      <div>
        <q-icon name="hourglass_empty" color="grey-6" size="md" />
        <div class="text-caption text-grey-5 q-mt-xs">No timeline events available</div>
      </div>
    </div>

    <!-- Success State -->
    <div v-else-if="status === 'success'" class="q-pa-md column h-full">
      <div class="row items-center justify-between q-mb-md">
        <span class="text-operator-title text-grey-5 text-uppercase" style="font-size: 9.5px; letter-spacing: 1.5px;">Quasar Settlement Chronology</span>
        <div class="row items-center op-gap-4">
          <span v-if="isCached" class="text-amber-5 text-metric-sm" title="Serving from Cache">CACHED</span>
          <span v-if="isRealtime" class="live-indicator-dot pulse-healthy"></span>
          <q-btn flat round dense size="xs" color="grey-6" icon="refresh" @click="fetchData(true)" />
        </div>
      </div>
      
      <div class="timeline-stepper column q-gap-12">
        <div v-for="(phase, idx) in phases" :key="idx" class="row items-start no-wrap timeline-node q-pb-md">
          <div class="column items-center q-mr-md" style="height: 100%;">
            <q-avatar size="24px" :color="phase.active ? 'green-10' : 'grey-9'" :text-color="phase.active ? 'green-4' : 'grey-5'" class="text-weight-bold font-mono" style="font-size: 11px;">
              {{ idx + 1 }}
            </q-avatar>
            <div v-if="idx < phases.length - 1" class="line-connector" :class="phase.active ? 'connector-active' : ''"></div>
          </div>
          
          <div class="col text-left">
            <div class="row items-center justify-between">
              <span class="text-caption text-weight-bold text-white">{{ phase.title }}</span>
              <q-badge v-if="phase.active" color="green-10" text-color="green-3" class="text-metric-sm font-mono">VERIFIED</q-badge>
              <q-badge v-else color="grey-10" text-color="grey-6" class="text-metric-sm font-mono">PENDING</q-badge>
            </div>
            <div class="text-caption text-grey-5 font-mono q-mt-xs" style="font-size: 10.5px;">{{ phase.desc }}</div>
          </div>
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/index';
import { useRuntimeStore } from '../../stores/runtime.store';

const status = ref('loading');
const errorMessage = ref('');
const isCached = ref(false);
const isRealtime = ref(false);
const phases = ref([]);

const fetchData = async (forceRefresh = false) => {
  status.value = 'loading';
  try {
    const store = useRuntimeStore();
    const { data } = await api.get('/api/v1/finance/settlement-phases', { headers: { 'x-tenant-id': store.tenantId } });
    phases.value = data;
    status.value = 'success';
  } catch (err) {
    status.value = 'error';
    errorMessage.value = err.message || 'Failed to fetch timeline';
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.h-full { height: 100%; }
.bg-black-transparent { background: rgba(0, 0, 0, 0.7); }

.timeline-stepper { position: relative; }
.line-connector {
  width: 2px;
  background: rgba(255, 255, 255, 0.06);
  flex-grow: 1;
  margin-top: 4px;
  min-height: 40px;
}
.connector-active { background: #2e7d32; }
</style>
