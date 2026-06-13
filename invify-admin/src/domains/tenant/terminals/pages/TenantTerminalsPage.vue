<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="point_of_sale" color="cyan-3" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">POS Terminals</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Manage EMV point-of-sale terminals connected to your store.
        </div>
      </div>
    </div>
    
    <div class="q-pa-md bg-card-dark rounded-borders border-grey-9">
      <q-table
        dark
        :rows="terminals"
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
import { useTenantTerminalStore } from '../stores/tenantTerminalStore';

const store = useTenantTerminalStore();
const { terminals } = storeToRefs(store);

const columns = [
  { name: 'id', label: 'Terminal ID', field: 'id', align: 'left' },
  { name: 'name', label: 'Terminal Name', field: 'name', align: 'left' },
  { name: 'location', label: 'Location', field: 'location', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' }
];

onMounted(() => {
  store.loadTerminals();
});
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.letter-spacing-1 { letter-spacing: 1px; }
</style>
