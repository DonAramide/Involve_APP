<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="devices" color="cyan-3" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Devices</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Manage hardware devices connected to the tenant workspace.
        </div>
      </div>
    </div>
    
    <div class="q-pa-md bg-card-dark rounded-borders border-grey-9">
      <q-table
        dark
        :rows="devices"
        :columns="columns"
        row-key="id"
        flat
        class="bg-transparent"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip :color="props.value === 'active' ? 'green-9' : 'red-9'" text-color="white" size="xs" dense>
              {{ props.value?.toUpperCase() }}
            </q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-plan="props">
          <q-td :props="props">
            <q-badge :color="props.value === 'TRIAL MODE' ? 'orange-9' : 'indigo-9'" text-color="white" class="text-weight-bold font-mono q-pa-xs">
              {{ props.value }}
            </q-badge>
          </q-td>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useTenantDeviceStore } from '../stores/tenantDeviceStore';

const store = useTenantDeviceStore();
const { devices } = storeToRefs(store);

const columns = [
  { name: 'id', label: 'Device ID', field: 'id', align: 'left' },
  { name: 'name', label: 'Device Name', field: 'name', align: 'left' },
  { name: 'plan', label: 'Active Plan', field: 'plan', align: 'left' },
  { name: 'expiry', label: 'Expiration Date', field: 'expiry', align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' }
];

onMounted(() => {
  store.loadDevices();
});
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.letter-spacing-1 { letter-spacing: 1px; }
</style>
