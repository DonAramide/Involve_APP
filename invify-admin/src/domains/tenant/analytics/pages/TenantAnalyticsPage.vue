<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="insights" color="cyan-3" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Analytics & Insights</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Real-time business telemetry and predictive insights.
        </div>
      </div>
    </div>
    
    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-4">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg">
          <div class="text-caption text-grey-5">Total Revenue</div>
          <div class="text-h5 text-weight-bold">₦{{ metrics.revenue?.toLocaleString() || 0 }}</div>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg">
          <div class="text-caption text-grey-5">Active Users</div>
          <div class="text-h5 text-weight-bold">{{ metrics.activeUsers || 0 }}</div>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg">
          <div class="text-caption text-grey-5">Transactions</div>
          <div class="text-h5 text-weight-bold">{{ metrics.transactions || 0 }}</div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useTenantAnalyticsStore } from '../stores/tenantAnalyticsStore';

const store = useTenantAnalyticsStore();
const { metrics } = storeToRefs(store);

onMounted(() => {
  store.loadMetrics();
});
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.letter-spacing-1 { letter-spacing: 1px; }
</style>
