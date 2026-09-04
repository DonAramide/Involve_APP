<template>
  <q-card class="bg-card-dark text-white shadow-2 q-pa-md rounded-borders overflow-hidden relative-position column h-full border-cyan-left" style="min-height: 140px;">
    <div class="row items-center justify-between q-mb-sm">
      <span class="text-overline text-cyan-4 letter-spacing-1" style="font-size: 8.5px; letter-spacing: 1.5px;">SERVICE JOBS PIPELINE</span>
      <q-btn flat round dense size="xs" color="cyan-4" icon="refresh" :loading="loading" @click="load" />
    </div>

    <div v-if="error" class="text-caption text-red-4">{{ error }}</div>
    <div v-else>
      <div class="row q-col-gutter-sm q-mb-sm">
        <div class="col-4 column">
          <span class="text-caption text-grey-5">Jobs</span>
          <span class="text-h6 text-weight-bolder text-metric-mono">{{ summary.totalJobs }}</span>
        </div>
        <div class="col-4 column">
          <span class="text-caption text-amber-5">Active</span>
          <span class="text-h6 text-weight-bolder text-metric-mono text-amber-4">{{ summary.activeJobs }}</span>
        </div>
        <div class="col-4 column">
          <span class="text-caption text-green-5">Ready</span>
          <span class="text-h6 text-weight-bolder text-metric-mono text-green-4">{{ summary.readyJobs }}</span>
        </div>
      </div>

      <div class="text-caption text-grey-5 q-mb-xs">
        Collected ₦{{ format(summary.collected) }} / billed ₦{{ format(summary.billed) }}
      </div>
      <div class="text-caption text-grey-6 q-mb-sm">
        {{ summary.source === 'jobs' ? 'From synced service jobs' : 'From service invoices until jobs sync from the mobile app' }}
      </div>

      <div v-if="recent.length" class="column q-gutter-xs">
        <div v-for="job in recent" :key="job.id" class="row items-center justify-between text-caption">
          <span class="ellipsis" style="max-width: 62%;">{{ job.title }}</span>
          <q-badge :color="statusColor(job.status)" outline>{{ String(job.status || '').toUpperCase() }}</q-badge>
        </div>
      </div>
      <router-link to="/tenant/services/jobs" class="text-cyan-4 text-caption q-mt-sm" style="text-decoration: none;">
        View all jobs
      </router-link>
    </div>
  </q-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { servicesApi } from '../../api';

const loading = ref(false);
const error = ref('');
const recent = ref([]);
const summary = reactive({
  source: 'none',
  totalJobs: 0,
  activeJobs: 0,
  readyJobs: 0,
  billed: 0,
  collected: 0,
});

const format = (val) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statusColor = (status) => {
  const value = String(status || '').toLowerCase();
  if (['ready', 'completed', 'paid', 'delivered', 'done'].includes(value)) return 'green';
  if (['in_progress', 'pending', 'partial', 'unpaid'].includes(value)) return 'amber';
  return 'grey';
};

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await servicesApi.getSummary();
    summary.source = data.source || 'none';
    summary.totalJobs = data.totalJobs || 0;
    summary.activeJobs = data.activeJobs || 0;
    summary.readyJobs = data.readyJobs || 0;
    summary.billed = data.billed || 0;
    summary.collected = data.collected || 0;
    recent.value = (data.recent || []).slice(0, 5);
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to load jobs';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.bg-card-dark { background-color: #12191c; }
.border-cyan-left { border-left: 3px solid #22d3ee; }
.letter-spacing-1 { letter-spacing: 1.5px; }
.h-full { height: 100%; }
</style>
