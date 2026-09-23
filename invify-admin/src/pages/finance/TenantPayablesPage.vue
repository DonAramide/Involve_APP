<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div>
        <div class="text-operator-title text-muted">Treasury Holdings</div>
        <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
          Tenant Payables
        </div>
      </div>
      <q-btn
        outline
        size="xs"
        color="grey-6"
        icon="refresh"
        label="Refresh"
        class="text-caption text-weight-bold"
        :loading="loading"
        @click="loadRows"
      />
    </div>

    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left">
          <div class="text-operator-title text-muted">Total Held</div>
          <div class="text-h5 text-metric-mono text-green-4">₦{{ formatMoney(totals.held) }}</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left">
          <div class="text-operator-title text-muted">Wallet Balance</div>
          <div class="text-h5 text-metric-mono text-cyan-4">₦{{ formatMoney(totals.wallet) }}</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left">
          <div class="text-operator-title text-muted">Pending VA</div>
          <div class="text-h5 text-metric-mono text-amber-5">₦{{ formatMoney(totals.pendingVa) }}</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left">
          <div class="text-operator-title text-muted">Tenants With Balance</div>
          <div class="text-h5 text-metric-mono text-indigo-4">{{ totals.withBalance || 0 }}</div>
        </div>
      </div>
    </div>

    <div class="enterprise-panel bg-panel col column no-wrap">
      <q-table
        flat
        dense
        dark
        class="bg-transparent text-main col"
        :rows="rows"
        :columns="columns"
        row-key="tenantId"
        :loading="loading"
        :pagination="{ rowsPerPage: 25 }"
      >
        <template #body-cell-totalHeld="props">
          <q-td :props="props" class="text-metric-mono text-weight-bold">
            ₦{{ formatMoney(props.row.totalHeld) }}
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width row flex-center text-muted q-pa-lg text-caption">
            {{ loading ? 'Loading payables…' : 'No tenant payables found.' }}
          </div>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from '../../api'
import { userFacingApiError } from '../../utils/userFacingApiError'

const $q = useQuasar()
const loading = ref(false)
const rows = ref([])
const totals = ref({ wallet: 0, pendingVa: 0, unsettledCard: 0, held: 0, withBalance: 0 })

const columns = [
  { name: 'tenantName', label: 'Tenant', field: 'tenantName', align: 'left', sortable: true },
  { name: 'type', label: 'Type', field: 'type', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'walletBalance', label: 'Wallet', field: (r) => `₦${formatMoney(r.walletBalance)}`, align: 'right', sortable: true },
  { name: 'pendingVaBalance', label: 'Pending VA', field: (r) => `₦${formatMoney(r.pendingVaBalance)}`, align: 'right', sortable: true },
  { name: 'unsettledCardBalance', label: 'Unsettled Card', field: (r) => `₦${formatMoney(r.unsettledCardBalance)}`, align: 'right', sortable: true },
  { name: 'totalHeld', label: 'Total Held', field: 'totalHeld', align: 'right', sortable: true },
  { name: 'virtualAccountNumber', label: 'NUBAN', field: (r) => r.virtualAccountNumber || '—', align: 'left' },
]

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadRows() {
  loading.value = true
  try {
    const res = await adminApi.getTenantPayables()
    const payload = res?.data || {}
    rows.value = Array.isArray(payload.rows) ? payload.rows : (Array.isArray(payload) ? payload : [])
    totals.value = payload.totals || {
      wallet: rows.value.reduce((s, r) => s + Number(r.walletBalance || 0), 0),
      pendingVa: rows.value.reduce((s, r) => s + Number(r.pendingVaBalance || 0), 0),
      unsettledCard: rows.value.reduce((s, r) => s + Number(r.unsettledCardBalance || 0), 0),
      held: rows.value.reduce((s, r) => s + Number(r.totalHeld || 0), 0),
      withBalance: rows.value.filter((r) => Number(r.totalHeld || 0) > 0).length,
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: userFacingApiError(err, 'Failed to load tenant payables') })
  } finally {
    loading.value = false
  }
}

onMounted(loadRows)
</script>
