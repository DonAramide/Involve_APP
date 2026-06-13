<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="history" color="cyan-3" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Audit Logs</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Immutable audit lineage of system actions.
        </div>
      </div>
    </div>
    
    <div class="q-pa-md bg-card-dark rounded-borders border-grey-9">
      <q-table
        dark
        :rows="auditLogs"
        :columns="columns"
        row-key="id"
        flat
        class="bg-transparent"
      >
      </q-table>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useTenantAuditStore } from '../stores/tenantAuditStore';

const store = useTenantAuditStore();
const { auditLogs } = storeToRefs(store);

const columns = [
  { name: 'id', label: 'Log ID', field: 'id', align: 'left' },
  { name: 'action', label: 'Action', field: 'action', align: 'left' },
  { name: 'user', label: 'User', field: 'user', align: 'left' },
  { name: 'date', label: 'Timestamp', field: 'date', align: 'right' }
];

onMounted(() => {
  store.loadAuditLogs();
});
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.letter-spacing-1 { letter-spacing: 1px; }
</style>
