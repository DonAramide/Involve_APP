<!-- invify-admin/src/pages/finance/TransactionInvestigationCenterPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main">
    
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Finance Foundation Layer</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Transaction Investigation Center
          </div>
        </div>
        <q-chip dense color="cyan-10" text-color="cyan-3" class="text-metric-sm q-ma-none font-mono">
          LIVE_DATA
        </q-chip>
      </div>

      <div class="row items-center op-gap-8 no-wrap">
        <q-btn
          outline
          size="xs"
          color="grey-6"
          icon="refresh"
          label="Refresh"
          class="text-caption text-weight-bold"
          :loading="loading"
          @click="loadTransactions"
        />
      </div>
    </div>

    <!-- KPIs (computed from live rows only) -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left">
          <div class="text-operator-title text-muted">Loaded Transactions</div>
          <div class="text-h4 text-metric-mono text-cyan-4">{{ kpis.total }} <span class="text-caption text-muted">TXNs</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left">
          <div class="text-operator-title text-muted">Pending / Unsettled</div>
          <div class="text-h4 text-metric-mono text-indigo-4">{{ kpis.pending }} <span class="text-caption text-muted">TXNs</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left">
          <div class="text-operator-title text-muted">Failed / Declined</div>
          <div class="text-h4 text-metric-mono text-amber-5">{{ kpis.failed }} <span class="text-caption text-muted">TXNs</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left">
          <div class="text-operator-title text-muted">Total Volume</div>
          <div class="text-h4 text-metric-mono text-red-5">{{ currentCurrency.symbol }}{{ formatMoney(kpis.volume) }}</div>
        </div>
      </div>
    </div>

    <!-- Master Transaction Grid -->
    <div class="enterprise-panel bg-panel full-height column no-wrap" style="height: calc(100vh - 220px);">
      <div class="enterprise-subpanel q-pa-sm row items-center justify-between no-wrap border-bottom">
        <div class="row items-center op-gap-8">
          <q-icon name="sync_alt" color="cyan-4" size="sm" />
          <span class="text-subtitle2 text-weight-bold">Global Transaction Ledger Explorer</span>
        </div>
        <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search TXN ID, tenant, reference..." class="text-caption" style="width: 300px;">
          <template v-slot:append>
            <q-icon name="search" color="grey-5" />
          </template>
        </q-input>
      </div>

      <q-table
        class="bg-transparent text-main flex-grow-1 transaction-table"
        flat
        :rows="filteredTransactions"
        :columns="columns"
        row-key="id"
        :loading="loading"
        :pagination="pagination"
        :rows-per-page-options="[25, 50, 100]"
        dense
        virtual-scroll
        style="height: 100%;"
      >
        <template v-slot:body-cell-id="props">
          <q-td :props="props" class="font-mono text-cyan-3 cursor-pointer" @click="inspectTransaction(props.row)">
            {{ props.value }}
          </q-td>
        </template>

        <template v-slot:body-cell-tenantName="props">
          <q-td :props="props">
            <div class="text-main text-weight-medium">{{ props.row.tenantName || '—' }}</div>
            <div class="text-muted font-mono" style="font-size: 10px;">{{ props.row.tenantId || '—' }}</div>
          </q-td>
        </template>
        
        <template v-slot:body-cell-amount="props">
          <q-td :props="props" class="font-mono text-weight-bold" :class="props.row.type === 'CREDIT' ? 'text-green-4' : 'text-amber-4'">
            {{ props.row.type === 'CREDIT' ? '+' : '-' }}{{ currentCurrency.symbol }}{{ Number(props.value || 0).toLocaleString() }}
          </q-td>
        </template>

        <template v-slot:body-cell-fraudFlags="props">
          <q-td :props="props">
            <q-badge v-if="props.value > 0" color="red-10" text-color="red-3" :label="`${props.value} Flags`" />
            <q-badge v-else color="blue-grey-9" text-color="grey-5" label="Clear" />
          </q-td>
        </template>
        
        <template v-slot:body-cell-reconciliationStatus="props">
          <q-td :props="props">
            <q-badge
              :color="reconBadge(props.value).bg"
              :text-color="reconBadge(props.value).fg"
            >
              {{ props.value }}
            </q-badge>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat dense round size="sm" icon="policy" color="grey-4" @click="inspectTransaction(props.row)">
              <q-tooltip>Deep Inspect</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width row flex-center q-pa-xl text-grey-6">
            <q-icon size="2em" name="receipt_long" class="q-mr-sm" />
            <span>{{ loading ? 'Loading transactions…' : 'No live transactions found.' }}</span>
          </div>
        </template>
      </q-table>
    </div>

    <!-- Deep Inspection Drawer -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="720">
      <div v-if="selectedTx" class="column full-height">
        
        <div class="q-pa-md border-bottom bg-subpanel">
          <div class="row justify-between items-start q-mb-md">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="cyan-10" text-color="cyan-3" label="TXN INVESTIGATION" />
                <div class="text-h6 font-mono text-main">{{ selectedTx.id }}</div>
              </div>
              <div class="text-caption text-muted font-mono">
                Ref: {{ selectedTx.reference || '—' }} · Provider: {{ selectedTx.provider || '—' }}
              </div>
            </div>
            <q-btn flat dense round icon="close" @click="drawerOpen = false" />
          </div>
        </div>

        <q-scroll-area class="col q-pa-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="text-operator-title text-muted q-mb-sm">Financial Core</div>
              <div class="enterprise-subpanel q-pa-sm border-muted rounded-borders font-mono text-caption">
                <div class="row justify-between q-mb-xs"><span>Amount:</span> <span class="text-white text-h6" style="line-height:1">{{ currentCurrency.symbol }}{{ Number(selectedTx.amount || 0).toLocaleString() }}</span></div>
                <div class="row justify-between q-mb-xs"><span>Type:</span> <span :class="selectedTx.type === 'CREDIT' ? 'text-green-4' : 'text-amber-4'">{{ selectedTx.type }}</span></div>
                <div class="row justify-between q-mb-xs"><span>Channel:</span> <span class="text-white">{{ selectedTx.channel }}</span></div>
                <div class="row justify-between q-mb-xs"><span>Status:</span> <span class="text-white">{{ selectedTx.reconciliationStatus }}</span></div>
              </div>
            </div>

            <div class="col-12 col-md-6">
              <div class="text-operator-title text-muted q-mb-sm">Tenant Context</div>
              <div class="enterprise-subpanel q-pa-sm border-muted rounded-borders font-mono text-caption">
                <div class="row justify-between q-mb-xs"><span>Tenant:</span> <span class="text-white">{{ selectedTx.tenantName || '—' }}</span></div>
                <div class="row justify-between q-mb-xs"><span>Tenant ID:</span> <span class="text-cyan-3">{{ selectedTx.tenantId || '—' }}</span></div>
                <div class="row justify-between q-mb-xs"><span>Timestamp:</span> <span class="text-white">{{ selectedTx.timestamp }}</span></div>
              </div>
            </div>

            <div class="col-12" v-if="selectedTx.raw">
              <div class="text-operator-title text-muted q-mb-sm">Raw Record</div>
              <pre class="enterprise-subpanel q-pa-sm border-muted rounded-borders text-secondary font-mono" style="font-size: 10px; white-space: pre-wrap; word-break: break-all;">{{ JSON.stringify(selectedTx.raw, null, 2) }}</pre>
            </div>
          </div>
        </q-scroll-area>
      </div>
    </q-drawer>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from '../../api'

const $q = useQuasar()
const searchQuery = ref('')
const drawerOpen = ref(false)
const selectedTx = ref(null)
const loading = ref(false)
const transactions = ref([])
const tenantNameById = ref({})

const pagination = ref({ rowsPerPage: 25, sortBy: 'timestamp', descending: true })

const columns = [
  { name: 'id', label: 'TXN ID', field: 'id', align: 'left' },
  { name: 'timestamp', label: 'TIMESTAMP', field: 'timestamp', align: 'left', sortable: true },
  { name: 'tenantName', label: 'TENANT', field: 'tenantName', align: 'left' },
  { name: 'amount', label: 'AMOUNT', field: 'amount', align: 'right', sortable: true },
  { name: 'channel', label: 'CHANNEL', field: 'channel', align: 'center' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' },
  { name: 'fraudFlags', label: 'FRAUD FLAGS', field: 'fraudFlags', align: 'center' },
  { name: 'reconciliationStatus', label: 'STATUS', field: 'reconciliationStatus', align: 'center' },
  { name: 'actions', label: '', field: 'actions', align: 'right' }
]

const filteredTransactions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return transactions.value
  return transactions.value.filter((t) =>
    [t.id, t.tenantId, t.tenantName, t.reference, t.channel, t.reconciliationStatus]
      .join(' ')
      .toLowerCase()
      .includes(q)
  )
})

const kpis = computed(() => {
  const rows = transactions.value
  let pending = 0
  let failed = 0
  let volume = 0
  for (const r of rows) {
    volume += Number(r.amount || 0)
    const s = String(r.reconciliationStatus || '').toUpperCase()
    if (['PENDING', 'UNSETTLED', 'APPROVED (UNSETTLED)', 'HELD', 'QUEUED'].some(x => s.includes(x))) pending += 1
    if (['FAILED', 'DECLINED', 'ERROR'].some(x => s.includes(x))) failed += 1
  }
  return { total: rows.length, pending, failed, volume }
})

function formatMoney(n) {
  const v = Number(n || 0)
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  return v.toLocaleString()
}

function reconBadge(status) {
  const s = String(status || '').toUpperCase()
  if (s.includes('MATCHED') || s.includes('SETTLED') || s.includes('SUCCESS') || s.includes('PAID')) {
    return { bg: 'green-10', fg: 'green-3' }
  }
  if (s.includes('UNSETTLED') || s.includes('APPROVED')) {
    return { bg: 'amber-10', fg: 'amber-2' }
  }
  if (s.includes('FAIL') || s.includes('DECLIN')) {
    return { bg: 'red-10', fg: 'red-3' }
  }
  return { bg: 'amber-10', fg: 'amber-3' }
}

function mapPaymentRow(p) {
  const status = String(p.status || p.payment_status || 'PENDING').toUpperCase()
  const amount = Number(p.amount || p.total_amount || 0)
  const tenantId = p.tenant_id || p.tenantId || null
  const tenantName =
    p.tenants?.name ||
    p.tenant_name ||
    tenantNameById.value[tenantId] ||
    null

  let channel = p.provider || p.payment_method || p.channel || 'Payment'
  if (/pos|card|emv/i.test(channel)) channel = 'POS Terminal'
  else if (/wallet/i.test(channel)) channel = 'Wallet Transfer'
  else if (/transfer|virtual|bank/i.test(channel)) channel = 'Bank Transfer'

  return {
    id: p.id || p.reference || `pay-${Date.now()}`,
    tenantId,
    tenantName,
    amount,
    type: amount >= 0 ? 'CREDIT' : 'DEBIT',
    channel,
    riskScore: Number(p.risk_score || 0),
    fraudFlags: Number(p.fraud_flags || 0),
    reconciliationStatus: status,
    settlementStatus: p.settlement_status || null,
    reference: p.reference || p.payment_reference || null,
    provider: p.provider || null,
    timestamp: p.created_at || p.updated_at || p.timestamp || null,
    raw: p
  }
}

async function loadTransactions() {
  loading.value = true
  try {
    try {
      const tenantsRes = await adminApi.getTenants()
      const tenants = Array.isArray(tenantsRes.data) ? tenantsRes.data : (tenantsRes.data?.data || [])
      const map = {}
      for (const t of tenants) {
        if (t?.id) map[t.id] = t.name || t.agent_code || t.id
      }
      tenantNameById.value = map
    } catch {
      tenantNameById.value = {}
    }

    const res = await adminApi.getPayments()
    const rows = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    transactions.value = rows.map(mapPaymentRow)
  } catch (e) {
    console.error('[TransactionInvestigation] load failed:', e)
    transactions.value = []
    $q.notify({
      type: 'negative',
      message: e?.response?.data?.error || e?.response?.data?.message || 'Failed to load live transactions'
    })
  } finally {
    loading.value = false
  }
}

const inspectTransaction = (row) => {
  selectedTx.value = row
  drawerOpen.value = true
}

onMounted(loadTransactions)
</script>

<style scoped>
.transaction-table :deep(th) {
  font-size: 10px;
  font-weight: 700;
  color: var(--enterprise-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--enterprise-border);
}
.transaction-table :deep(td) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}
.transaction-table :deep(tbody tr:hover) {
  background-color: rgba(255, 255, 255, 0.02) !important;
}

.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.drawer-shadow {
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
}

.border-cyan-left { border-left: 2px solid #22b8cf !important; }
.border-indigo-left { border-left: 2px solid #7048e8 !important; }
.border-amber-left { border-left: 2px solid #fcc419 !important; }
.border-red-left { border-left: 2px solid #c92a2a !important; }
</style>
