<!-- invify-admin/src/pages/tenant/TenantReconciliationPage.vue -->
<template>
  <q-page class="q-pa-lg text-white relative-position" style="background: #05070d; min-height: 100vh;">
    <SecureFinanceGate>
      <div class="row items-center justify-between q-mb-xl">
        <div>
          <div class="row items-center op-gap-8 no-wrap">
            <q-icon name="account_tree" color="amber-4" size="md" />
            <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Reconciliation Center</h1>
          </div>
          <div class="text-caption text-grey-5 q-mt-xs">
            Match operational payments against treasury clearing ledgers.
          </div>
        </div>

        <q-btn
          unelevated
          color="amber-9"
          text-color="black"
          icon="checklist"
          label="Refresh Audit Match"
          @click="loadData"
          :loading="auditing"
          class="text-weight-bold text-caption text-black"
        />
      </div>

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

      <q-card class="bg-card-dark border-grey-9 q-pa-lg">
        <div class="row items-center justify-between q-mb-md">
          <div>
            <div class="text-h6 text-weight-bold text-white">Discrepancy Resolution Workspace</div>
            <div class="text-caption text-grey-5">Settlement and payment cases requiring audit attention.</div>
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
          no-data-label="No reconciliation cases yet"
        >
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="statusColor(props.value)" class="text-weight-bold font-mono">
                {{ props.value }}
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-discrepancy="props">
            <q-td :props="props" class="text-metric-mono font-mono text-weight-bold" :class="props.value ? 'text-red-4' : 'text-grey-5'">
              {{ currentCurrency.symbol }}{{ Number(props.value || 0).toLocaleString() }}
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
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import SecureFinanceGate from '../../../../components/finance/SecureFinanceGate.vue'
import { reconciliationApi } from '../../../../api'
import { userFacingApiError } from '../../../../utils/userFacingApiError'

const { currentCurrency } = useCurrency();
const $q = useQuasar()
const auditing = ref(false)
const batchFilter = ref('all')
const batches = ref([])
const summary = ref({
  matched: 0,
  unmatched: 0,
  mismatchAmount: 0,
  reconciliationRate: 0,
  totalPayments: 0,
})

const columns = [
  { name: 'batch', label: 'SETTLEMENT BATCH ID', field: 'batch', align: 'left', sortable: true },
  { name: 'deviceCount', label: 'DEVICE RECORDINGS', field: 'devices', align: 'center' },
  { name: 'treasuryCount', label: 'TREASURY PAYMENTS', field: 'treasury', align: 'center' },
  { name: 'discrepancy', label: 'DISCREPANCY DELTA', field: 'delta', align: 'right', sortable: true },
  { name: 'status', label: 'RECONCILIATION STATE', field: 'status', align: 'center' },
  { name: 'actions', label: 'RESOLUTION ACTIONS', align: 'center' }
]

const kpis = computed(() => {
  const s = summary.value
  const matchedCount = batches.value.filter((b) => b.status === 'MATCHED' || b.status === 'RESOLVED').length
  const pendingCount = batches.value.filter((b) => b.status === 'MISMATCH' || b.status === 'PENDING').length
  const mismatchSum = batches.value.reduce((n, b) => n + Number(b.delta || 0), 0)
  const health = s.reconciliationRate
    ? `${Number(s.reconciliationRate).toFixed(1)}%`
    : (batches.value.length
      ? `${((matchedCount / batches.value.length) * 100).toFixed(1)}%`
      : '—')
  return [
    {
      label: 'Cleared Ledger Matched',
      value: `${currentCurrency.value.symbol}${Number(s.matched || matchedCount).toLocaleString()}`,
      icon: 'task_alt',
      color: 'green-4',
      subtitle: `${matchedCount} case${matchedCount === 1 ? '' : 's'} matched`,
    },
    {
      label: 'Pending Batch Audits',
      value: `${pendingCount} Batch${pendingCount === 1 ? '' : 'es'}`,
      icon: 'pending_actions',
      color: 'amber-4',
      subtitle: pendingCount ? 'Requires match review' : 'No pending audits',
    },
    {
      label: 'Historical Mismatch Anomaly',
      value: `${currentCurrency.value.symbol}${Number(s.mismatchAmount || mismatchSum).toLocaleString()}`,
      icon: 'gpp_maybe',
      color: 'red-4',
      subtitle: pendingCount ? 'Open discrepancy amount' : 'No open mismatches',
    },
    {
      label: 'Reconciliation Health',
      value: health,
      icon: 'insights',
      color: 'indigo-4',
      subtitle: 'Live match rate',
    },
  ]
})

const filteredBatches = computed(() => {
  return batches.value.filter((b) => {
    if (batchFilter.value === 'mismatch' && b.status !== 'MISMATCH') return false
    if (batchFilter.value === 'resolved' && b.status !== 'RESOLVED' && b.status !== 'MATCHED') return false
    return true
  })
})

function statusColor(status) {
  if (status === 'MATCHED') return 'green-10'
  if (status === 'RESOLVED') return 'indigo-10'
  return 'red-10'
}

function mapRow(r, index) {
  const status = String(r.status || 'PENDING').toUpperCase()
  return {
    id: r.id || r.case_number || `row-${index}`,
    batch: r.settlementBatchId || r.ledgerBatchId || r.id || r.case_number || '—',
    devices: r.deviceCount ?? r.device_recordings ?? 0,
    treasury: r.treasuryCount ?? r.treasury_payments ?? 0,
    delta: Number(r.difference ?? r.delta ?? r.mismatchAmount ?? 0),
    status,
  }
}

const loadData = async () => {
  auditing.value = true
  try {
    const res = await reconciliationApi.getReport({ status: 'all' })
    const payload = res?.data
    const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : [])
    batches.value = rows.map(mapRow)
    summary.value = {
      matched: 0,
      unmatched: 0,
      mismatchAmount: 0,
      reconciliationRate: 0,
      totalPayments: 0,
      ...(payload?.summary && typeof payload.summary === 'object' ? payload.summary : {}),
    }
  } catch (error) {
    batches.value = []
    $q.notify({ type: 'negative', message: userFacingApiError(error, 'Failed to load reconciliation data') })
  } finally {
    auditing.value = false
  }
}

const solveMatch = (row) => {
  $q.dialog({
    title: 'Discrepancy Resolution Override',
    message: `A delta of ${currentCurrency.value.symbol}${Number(row.delta || 0).toLocaleString()} was found on ${row.batch}. Approve force-match?`,
    cancel: true,
    dark: true,
  }).onOk(async () => {
    try {
      await reconciliationApi.forceMatch(row.id, { reason: 'Tenant operator force match' })
      $q.notify({ type: 'positive', message: `Case ${row.batch} submitted for match.` })
      await loadData()
    } catch (error) {
      $q.notify({ type: 'negative', message: userFacingApiError(error, 'Force match failed') })
    }
  })
}

onMounted(loadData)
</script>

<style scoped>
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }
.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
