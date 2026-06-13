<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="verified_user" color="cyan-3" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Compliance Scope</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Monitor KYC verification status and document lineage.
        </div>
      </div>
      <div>
        <q-badge color="green-9" text-color="green-3" class="text-weight-bold q-pa-sm">
          KYC Status: {{ kycStatus }}
        </q-badge>
      </div>
    </div>
    
    <div class="q-pa-md bg-card-dark rounded-borders border-grey-9">
      <q-table
        dark
        :rows="documents"
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
import { useTenantComplianceStore } from '../stores/tenantComplianceStore';

const store = useTenantComplianceStore();
const { kycStatus, documents } = storeToRefs(store);

const columns = [
  { name: 'id', label: 'Document ID', field: 'id', align: 'left' },
  { name: 'name', label: 'Document Name', field: 'name', align: 'left' },
  { name: 'status', label: 'Verification Status', field: 'status', align: 'center' }
];

onMounted(() => {
  store.loadCompliance();
});
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.letter-spacing-1 { letter-spacing: 1px; }
</style>
