<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="work_outline" color="cyan-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Service Jobs</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          {{ sourceLabel }}
        </div>
      </div>
      <q-btn outline color="grey-5" icon="refresh" label="Refresh" :loading="loading" @click="load" class="text-weight-bold text-caption" />
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
        <q-card class="bg-card-dark q-pa-md">
          <div class="text-caption text-grey-5">Jobs</div>
          <div class="text-h5 text-weight-bolder">{{ summary.totalJobs }}</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card class="bg-card-dark q-pa-md">
          <div class="text-caption text-amber-5">Active</div>
          <div class="text-h5 text-weight-bolder text-amber-4">{{ summary.activeJobs }}</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card class="bg-card-dark q-pa-md">
          <div class="text-caption text-green-5">Ready / collected</div>
          <div class="text-h5 text-weight-bolder text-green-4">₦{{ format(summary.collected) }}</div>
        </q-card>
      </div>
    </div>

    <q-card class="bg-card-dark border-grey-9">
      <q-table
        :rows="jobs"
        :columns="columns"
        row-key="id"
        dark
        flat
        bordered
        class="bg-card-dark"
        :loading="loading"
        :rows-per-page-options="[10, 20, 50]"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.value)" class="text-weight-bold font-mono" style="font-size: 10px;">
              {{ String(props.value || '').toUpperCase() }}
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-totalAmount="props">
          <q-td :props="props" class="text-metric-mono font-mono text-weight-bold">
            ₦{{ format(props.value) }}
          </q-td>
        </template>
        <template v-slot:body-cell-amountPaid="props">
          <q-td :props="props" class="text-metric-mono font-mono">
            ₦{{ format(props.value) }}
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { servicesApi } from '../../../../api';

const loading = ref(false);
const jobs = ref([]);
const summary = reactive({
  source: 'none',
  totalJobs: 0,
  activeJobs: 0,
  readyJobs: 0,
  billed: 0,
  collected: 0,
});

const columns = [
  { name: 'title', label: 'JOB', field: 'title', align: 'left', sortable: true },
  { name: 'customerName', label: 'CUSTOMER', field: 'customerName', align: 'left' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'left' },
  { name: 'totalAmount', label: 'BILLED', field: 'totalAmount', align: 'right' },
  { name: 'amountPaid', label: 'COLLECTED', field: 'amountPaid', align: 'right' },
];

const format = (val) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sourceLabel = computed(() =>
  summary.source === 'jobs'
    ? 'Synced from the mobile services app'
    : 'Showing service invoices until jobs sync from the device'
);

const statusColor = (status) => {
  const value = String(status || '').toLowerCase();
  if (['ready', 'completed', 'paid', 'delivered', 'done'].includes(value)) return 'green';
  if (['in_progress', 'pending', 'partial', 'unpaid'].includes(value)) return 'amber';
  return 'grey';
};

const load = async () => {
  loading.value = true;
  try {
    const { data } = await servicesApi.getSummary({ limit: 100 });
    summary.source = data.source || 'none';
    summary.totalJobs = data.totalJobs || 0;
    summary.activeJobs = data.activeJobs || 0;
    summary.readyJobs = data.readyJobs || 0;
    summary.billed = data.billed || 0;
    summary.collected = data.collected || 0;
    jobs.value = data.jobs || data.recent || [];
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.bg-card-dark { background-color: #12191c; }
.letter-spacing-1 { letter-spacing: 1px; }
</style>
