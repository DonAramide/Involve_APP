<!-- invify-admin/src/pages/tenant/TenantReconciliationPage.vue -->
<template>
  <q-page class="q-pa-lg text-white relative-position" style="background: #05070d; min-height: 100vh;">
    <SecureFinanceGate>
      <!-- Top Header -->
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="account_tree" color="amber-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Reconciliation Center</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Match operational device telemetry data against Quasar Treasury clearing ledgers autonomously.
        </div>
      </div>

      <q-btn unelevated color="amber-9" text-color="black" icon="checklist" label="Run Autonomous Audit Match" @click="runAuditSequence" :loading="auditing" class="text-weight-bold text-caption text-black" />
    </div>

    <!-- KPI Reconciliation Blocks -->
    <div class="row q-col-gutter-lg q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3" v-for="kpi in kpis" :key="kpi.label">
        <q-card class="bg-card-dark border-grey-9 q-pa-md">
          <div class="row items-center justify-between">
            <span class="text-operator-title text-grey-5 text-uppercase" style="font-size: 9.5px; letter-spacing: 1px;">{{ kpi.label }}</span>
            <q-icon :name="kpi.icon" :color="kpi.color" size="sm" />
          </div>
          <div class="text-h5 text-weight-bold text-white text-metric-mono q-mt-sm">{{ kpi.value }}</div>
          <div class="text-caption text-grey-6 q-mt-xs font-mono">{{ kpi.subtitle }}</div>
        </q-card>
      </div>
    </div>

    <!-- Main Reconciliation Table Matrix -->
    <q-card class="bg-card-dark border-grey-9 q-pa-lg">
      <div class="row items-center justify-between q-mb-md">
        <div>
          <div class="text-h6 text-weight-bold text-white">Discrepancy Resolution Workspace</div>
          <div class="text-caption text-grey-5">List of settlement batches requiring audit attention.</div>
        </div>
        
        <q-btn-toggle
          v-model="batchFilter"
          toggle-color="amber-9"
          color="black"
          dense
          flat
          text-color="grey-4"
          toggle-text-color="black"
          class="border-grey-9 q-px-sm font-mono text-caption"
          :options="[
            {label: 'ALL BATCHES', value: 'all'},
            {label: 'MISMATCH ALERTS', value: 'mismatch'},
            {label: 'RESOLVED', value: 'resolved'}
          ]"
        />
      </div>

      <q-table
        :rows="filteredBatches"
        :columns="columns"
        row-key="id"
        dark
        flat
        bordered
        class="bg-card-dark"
        :loading="auditing"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="props.value === 'MATCHED' ? 'green-10' : (props.value === 'RESOLVED' ? 'indigo-10' : 'red-10')" class="text-weight-bold font-mono">
              {{ props.value }}
            </q-badge>
          </q-td>
        </template>

        <template v-slot:body-cell-discrepancy="props">
          <q-td :props="props" class="text-metric-mono font-mono text-weight-bold text-red-4">
            {{ currentCurrency.symbol }}{{ props.value.toLocaleString() }}
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn 
              v-if="props.row.status === 'MISMATCH'" 
              flat 
              dense 
              color="amber-4" 
              label="Solve Match" 
              icon="troubleshoot"
              @click="solveMatch(props.row)"
              class="text-weight-bold text-caption font-mono"
            />
            <span v-else class="text-metric-sm text-grey-6 font-mono">No Action Needed</span>
          </q-td>
        </template>
      </q-table>
    </q-card>

    </SecureFinanceGate>
  </q-page>
</template>

<script setup>
import { useCurrency } from '../../../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import SecureFinanceGate from '../../../../components/finance/SecureFinanceGate.vue'

const $q = useQuasar()
const auditing = ref(false)
const batchFilter = ref('all')

const kpis = ref([
  { label: 'Cleared Ledger Matched', value: '₦12,450,200', icon: 'task_alt', color: 'green-4', subtitle: '184 Batches fully cleared' },
  { label: 'Pending Batch Audits', value: '1 Batch', icon: 'pending_actions', color: 'amber-4', subtitle: 'Requires manual match override' },
  { label: 'Historical Mismatch Anomaly', value: '₦42,000', icon: 'gpp_maybe', color: 'red-4', subtitle: 'Cryptographic ledger check flag' },
  { label: 'Reconciliation Health', value: '99.8%', icon: 'insights', color: 'indigo-4', subtitle: 'Target threshold: >99.5%' }
])

const columns = [
  { name: 'batch', label: 'SETTLEMENT BATCH ID', field: 'batch', align: 'left', sortable: true },
  { name: 'deviceCount', label: 'DEVICE RECORDINGS', field: 'devices', align: 'center' },
  { name: 'treasuryCount', label: 'TREASURY PAYMENTS', field: 'treasury', align: 'center' },
  { name: 'discrepancy', label: 'DISCREPANCY DELTA', field: 'delta', align: 'right', sortable: true },
  { name: 'status', label: 'RECONCILIATION STATE', field: 'status', align: 'center' },
  { name: 'actions', label: 'RESOLUTION ACTIONS', align: 'center' }
]

const batches = ref([
  { id: 1, batch: 'BT-MAY16-9281', devices: 42, treasury: 42, delta: 0, status: 'MATCHED' },
  { id: 2, batch: 'BT-MAY15-1104', devices: 35, treasury: 34, delta: 42000, status: 'MISMATCH' },
  { id: 3, batch: 'BT-MAY14-8802', devices: 51, treasury: 51, delta: 0, status: 'RESOLVED' },
  { id: 4, batch: 'BT-MAY13-4122', devices: 38, treasury: 38, delta: 0, status: 'MATCHED' }
])

const filteredBatches = computed(() => {
  return batches.value.filter(b => {
    if (batchFilter.value === 'mismatch' && b.status !== 'MISMATCH') return false
    if (batchFilter.value === 'resolved' && b.status !== 'RESOLVED' && b.status !== 'MATCHED') return false
    return true
  })
})

const runAuditSequence = () => {
  auditing.value = true
  setTimeout(() => {
    auditing.value = false
    $q.notify({ type: 'positive', message: 'Autonomous clearing matching scan complete. 1 warning flagged.' })
  }, 2000)
}

const solveMatch = (row) => {
  $q.dialog({
    title: 'Discrepancy Resolution Override',
    message: `A delta mismatch of {{ currentCurrency.symbol }}${row.delta.toLocaleString()} was found on Batch ${row.batch}. Discrepancy trace maps to terminal DSP-9044. Do you approve manual balance reconciliation authorization?`,
    cancel: true,
    dark: true
  }).onOk(() => {
    row.status = 'RESOLVED'
    row.delta = 0
    kpis.value[1].value = '0 Batches'
    kpis.value[2].value = '₦0'
    $q.notify({ type: 'positive', message: `Batch ${row.batch} resolved successfully. ledger sequence validated.` })
  })
}
</script>

<style scoped>
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }
.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
