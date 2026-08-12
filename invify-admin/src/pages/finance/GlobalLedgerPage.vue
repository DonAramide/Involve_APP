<!-- invify-admin/src/pages/finance/GlobalLedgerPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Posting Integrity Monitor -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Finance Foundation Layer</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Global Financial Ledger
          </div>
        </div>
        
        <!-- Posting Integrity Monitor -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 20px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Total Debits:</span>
            <span class="text-green-4 text-weight-bold">{{ currentCurrency.symbol }}{{ formatMoney(totals.debits) }}</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Total Credits:</span>
            <span class="text-amber-4 text-weight-bold">{{ currentCurrency.symbol }}{{ formatMoney(totals.credits) }}</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Difference:</span>
            <q-badge :color="totals.diff === 0 ? 'green-10' : 'amber-10'" :text-color="totals.diff === 0 ? 'green-3' : 'amber-3'">
              {{ currentCurrency.symbol }}{{ formatMoney(Math.abs(totals.diff)) }}
            </q-badge>
          </div>
          <q-icon :name="totals.diff === 0 ? 'check_circle' : 'warning'" :color="totals.diff === 0 ? 'green-4' : 'amber-4'" size="sm" />
        </div>
      </div>

      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh" class="text-caption text-weight-bold" :loading="loading" @click="loadLedger" />
        <q-btn size="xs" color="amber-4" icon="download" label="Export Ledger Data" class="text-caption text-weight-bold text-black" disable />
      </div>
    </div>

    <!-- KPIs -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left">
          <div class="text-operator-title text-muted">Ledger Entries</div>
          <div class="text-h4 text-metric-mono text-cyan-4">{{ ledgerEntries.length }} <span class="text-caption text-muted">ROWS</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left">
          <div class="text-operator-title text-muted">Total Debits</div>
          <div class="text-h4 text-metric-mono text-indigo-4">{{ currentCurrency.symbol }}{{ formatMoney(totals.debits) }}</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left">
          <div class="text-operator-title text-muted">Total Credits</div>
          <div class="text-h4 text-metric-mono text-amber-5">{{ currentCurrency.symbol }}{{ formatMoney(totals.credits) }}</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left">
          <div class="text-operator-title text-muted">Ledger Parity</div>
          <div class="text-h4 text-metric-mono text-green-4">{{ parityLabel }}</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Workspace Navigation -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-sm">
        <q-tabs v-model="activeTab" dense class="text-grey-5" active-color="amber-4" indicator-color="amber-4" align="left">
          <q-tab name="coa" label="Chart of Accounts" icon="account_tree" />
          <q-tab name="journal" label="Journal Explorer" icon="menu_book" />
          <q-tab name="ledger" label="Ledger Entries" icon="receipt_long" />
          <q-tab name="balances" label="Account Balances" icon="account_balance_wallet" />
          <q-tab name="history" label="Posting History" icon="history" />
          <q-tab name="batches" label="Batch Explorer" icon="dynamic_feed" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search accounts, journals..." class="text-caption" style="width: 250px;">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeTab" animated class="bg-transparent col" keep-alive>
        
        <!-- CHART OF ACCOUNTS -->
        <q-tab-panel name="coa" class="q-pa-none column">
          <div class="q-pa-sm bg-subpanel border-bottom row justify-between items-center text-caption font-mono text-muted">
            <div>Hierarchical representation of the Invify GL architecture.</div>
            <q-btn flat dense size="sm" icon="add" label="Add Account" color="amber-4" />
          </div>
          <q-scroll-area class="col q-pa-md">
            <div v-if="!coaNodes.length" class="full-height flex flex-center text-muted font-mono q-pa-xl">
              No chart of accounts configured in live data.
            </div>
            <q-tree
              v-else
              :nodes="coaNodes"
              node-key="id"
              default-expand-all
              color="amber-4"
              class="font-mono text-main"
            >
              <template v-slot:default-header="prop">
                <div class="row items-center op-gap-8 cursor-pointer full-width hover-bg q-pa-xs rounded-borders">
                  <q-icon :name="prop.node.icon || 'account_balance_wallet'" :color="prop.node.color || 'grey-5'" />
                  <div class="text-weight-bold" :class="`text-${prop.node.color || 'white'}`">{{ prop.node.id }}</div>
                  <div class="text-muted">{{ prop.node.label }}</div>
                  <q-space />
                  <q-badge v-if="prop.node.type" :color="getTypeColor(prop.node.type)" text-color="dark">{{ prop.node.type }}</q-badge>
                </div>
              </template>
            </q-tree>
          </q-scroll-area>
        </q-tab-panel>

        <!-- JOURNAL EXPLORER -->
        <q-tab-panel name="journal" class="q-pa-none column">
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="journals"
            :columns="journalCols"
            row-key="id"
            dense
            :loading="loading"
            :pagination="{ rowsPerPage: 25 }"
            :rows-per-page-options="[25, 50, 100]"
            virtual-scroll
            style="height: 100%;"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-amber-3 cursor-pointer text-weight-bold" @click="inspectJournal(props.row)">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="props.value === 'POSTED' ? 'green-10' : 'amber-10'" :text-color="props.value === 'POSTED' ? 'green-3' : 'amber-3'">
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- LEDGER ENTRIES -->
        <q-tab-panel name="ledger" class="q-pa-none column">
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="ledgerEntries"
            :columns="ledgerCols"
            row-key="id"
            dense
            :loading="loading"
            :pagination="{ rowsPerPage: 25 }"
            :rows-per-page-options="[25, 50, 100]"
            virtual-scroll
            style="height: 100%;"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-cyan-3 cursor-pointer text-weight-bold" @click="inspectLedger(props.row)">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-accountId="props">
              <q-td :props="props" class="font-mono" :class="props.row.type === 'DEBIT' ? 'text-cyan-3' : 'text-indigo-3'">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-debit="props">
              <q-td :props="props" class="font-mono text-green-4 text-right">
                {{ props.row.type === 'DEBIT' ? currentCurrency.symbol + props.row.amount.toLocaleString() : '-' }}
              </q-td>
            </template>
            <template v-slot:body-cell-credit="props">
              <q-td :props="props" class="font-mono text-amber-4 text-right">
                {{ props.row.type === 'CREDIT' ? currentCurrency.symbol + props.row.amount.toLocaleString() : '-' }}
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- ACCOUNT BALANCES -->
        <q-tab-panel name="balances" class="q-pa-none column">
          <q-scroll-area class="col q-pa-md">
            <div v-if="!accountBalances.length" class="full-height flex flex-center text-muted font-mono q-pa-xl">
              No account balances available from live ledger data.
            </div>
            <div class="row q-col-gutter-md" v-else>
              <div class="col-12 col-md-6 col-lg-4" v-for="bal in accountBalances" :key="bal.account">
                <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                  <div class="row justify-between items-center border-bottom q-pb-sm q-mb-sm">
                    <div class="text-weight-bold" :class="bal.color">{{ bal.account }}</div>
                    <q-badge color="dark" text-color="grey-4">{{ bal.type }}</q-badge>
                  </div>
                  <div class="row justify-between q-mb-xs">
                    <span class="text-muted text-caption">Opening:</span>
                    <span>{{ currentCurrency.symbol }}{{ bal.opening.toLocaleString() }}</span>
                  </div>
                  <div class="row justify-between q-mb-xs">
                    <span class="text-muted text-caption">Movement:</span>
                    <span :class="bal.movement >= 0 ? 'text-green-4' : 'text-amber-4'">{{ bal.movement >= 0 ? '+' : '' }}{{ currentCurrency.symbol }}{{ bal.movement.toLocaleString() }}</span>
                  </div>
                  <div class="row justify-between text-weight-bold q-mt-sm border-top q-pt-sm">
                    <span class="text-muted text-caption">Closing:</span>
                    <span class="text-h6" style="line-height:1">{{ currentCurrency.symbol }}{{ bal.closing.toLocaleString() }}</span>
                  </div>
                </div>
              </div>
            </div>
          </q-scroll-area>
        </q-tab-panel>

        <!-- POSTING HISTORY -->
        <q-tab-panel name="history" class="q-pa-none column">
          <div class="q-pa-md flex flex-center full-height">
            <div class="text-center text-muted font-mono">
              <q-icon name="history" size="xl" class="q-mb-md opacity-50" />
              <div>Posting History Archive</div>
              <div class="text-caption">Historical query layer is starting up...</div>
            </div>
          </div>
        </q-tab-panel>

        <!-- BATCH EXPLORER -->
        <q-tab-panel name="batches" class="q-pa-none column">
          <q-scroll-area class="col q-pa-md">
            <div v-if="!batchExplorer.length" class="full-height flex flex-center text-muted font-mono q-pa-xl">
              No settlement/ledger batches in live data.
            </div>
            <div class="row q-col-gutter-md" v-else>
              <div class="col-12 col-md-6 col-lg-4" v-for="batch in batchExplorer" :key="batch.id">
                <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                  <div class="row justify-between items-center border-bottom q-pb-sm q-mb-sm">
                    <div class="text-weight-bold text-cyan-3">{{ batch.id }}</div>
                    <q-badge :color="batch.status === 'Balanced' ? 'green-10' : 'amber-10'" :text-color="batch.status === 'Balanced' ? 'green-3' : 'amber-3'">{{ batch.status }}</q-badge>
                  </div>
                  <div class="row justify-between q-mb-xs">
                    <span class="text-muted text-caption">Total Entries:</span>
                    <span class="text-white">{{ batch.entries }}</span>
                  </div>
                  <div class="row justify-between q-mb-xs">
                    <span class="text-muted text-caption">Total Debits:</span>
                    <span class="text-green-4">{{ currentCurrency.symbol }}{{ batch.debits.toLocaleString() }}</span>
                  </div>
                  <div class="row justify-between q-mb-xs">
                    <span class="text-muted text-caption">Total Credits:</span>
                    <span class="text-amber-4">{{ currentCurrency.symbol }}{{ batch.credits.toLocaleString() }}</span>
                  </div>
                </div>
              </div>
            </div>
          </q-scroll-area>
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- Ledger Drill-Down Drawer -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="600">
      <div v-if="selectedLedger" class="column full-height">
        
        <!-- Drawer Header -->
        <div class="q-pa-md border-bottom bg-subpanel row justify-between items-start">
          <div>
            <div class="row items-center op-gap-8 q-mb-xs">
              <q-badge color="cyan-10" text-color="cyan-3" label="LEDGER TRACE" />
              <div class="text-h6 font-mono text-main">{{ selectedLedger.id }}</div>
            </div>
            <div class="text-caption text-muted font-mono">Timestamp: {{ selectedLedger.timestamp }}</div>
          </div>
          <q-btn flat dense round icon="close" v-close-popup />
        </div>

        <q-scroll-area class="col q-pa-md">
          
          <!-- Financial Flow Visualization -->
          <div class="text-operator-title text-muted q-mb-sm">Ledger Flow Visualization</div>
          <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono q-mb-md">
            <!-- DEBIT -->
            <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-cyan-left" style="width: 280px;" v-if="selectedLedger.type === 'DEBIT'">
              <div class="text-cyan-4 text-weight-bold">Debit Origin</div>
              <div class="text-muted text-caption">{{ selectedLedger.flow?.debit || '—' }}</div>
              <div class="text-green-4 text-weight-bold q-mt-xs">{{ currentCurrency.symbol }}{{ Number(selectedLedger.amount || 0).toLocaleString() }}</div>
            </div>
            <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-indigo-left" style="width: 280px;" v-else>
              <div class="text-indigo-4 text-weight-bold">Debit Origin</div>
              <div class="text-muted text-caption">{{ selectedLedger.flow?.debit || '—' }}</div>
            </div>

            <div class="q-py-sm"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>
            
            <!-- LEDGER NODE -->
            <div class="q-pa-sm border-muted rounded-borders bg-dark text-center" style="width: 280px;">
              <div class="text-amber-4 text-weight-bold">Invify Master Ledger</div>
              <div class="text-muted text-caption">Journal: {{ selectedLedger.journalId }}</div>
            </div>

            <div class="q-py-sm"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>

            <!-- CREDIT -->
            <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-amber-left" style="width: 280px;" v-if="selectedLedger.type === 'CREDIT'">
              <div class="text-amber-4 text-weight-bold">Credit Destination</div>
              <div class="text-muted text-caption">{{ selectedLedger.flow?.credit || '—' }}</div>
              <div class="text-amber-4 text-weight-bold q-mt-xs">{{ currentCurrency.symbol }}{{ Number(selectedLedger.amount || 0).toLocaleString() }}</div>
            </div>
            <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-indigo-left" style="width: 280px;" v-else>
              <div class="text-indigo-4 text-weight-bold">Credit Destination</div>
              <div class="text-muted text-caption">{{ selectedLedger.flow?.credit || '—' }}</div>
            </div>
          </div>

          <!-- Drill-Down Navigation -->
          <div class="text-operator-title text-muted q-mb-sm">Related Investigation Records</div>
          <div class="enterprise-subpanel border-muted rounded-borders font-mono text-caption q-mb-md">
            <q-list separator dark class="bg-transparent">
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related?.txn">
                <q-item-section avatar><q-badge color="cyan-10" text-color="cyan-3">TXN</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-cyan-3">{{ selectedLedger.related.txn }}</q-item-label><q-item-label caption>Source Transaction</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related?.set">
                <q-item-section avatar><q-badge color="indigo-10" text-color="indigo-3">SET</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-indigo-3">{{ selectedLedger.related.set }}</q-item-label><q-item-label caption>Settlement Batch</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related?.ten">
                <q-item-section avatar><q-badge color="grey-9" text-color="grey-4">TEN</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-grey-4">{{ selectedLedger.related.ten }}</q-item-label><q-item-label caption>Tenant Record</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related?.wal">
                <q-item-section avatar><q-badge color="blue-grey-10" text-color="blue-grey-3">WAL</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-blue-grey-3">{{ selectedLedger.related.wal }}</q-item-label><q-item-label caption>Wallet Entity</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related?.crd">
                <q-item-section avatar><q-badge color="amber-10" text-color="amber-3">CRD</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-amber-3">{{ selectedLedger.related.crd }}</q-item-label><q-item-label caption>Card Instrument</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related?.term">
                <q-item-section avatar><q-badge color="green-10" text-color="green-3">TRM</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-green-3">{{ selectedLedger.related.term }}</q-item-label><q-item-label caption>Terminal Device</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related?.aud">
                <q-item-section avatar><q-badge color="red-10" text-color="red-3">AUD</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-red-3">{{ selectedLedger.related.aud }}</q-item-label><q-item-label caption>Audit Engine Log</q-item-label></q-item-section>
              </q-item>
              <q-item v-if="!selectedLedger.related?.txn && !selectedLedger.related?.ten">
                <q-item-section class="text-muted">No related live links on this entry.</q-item-section>
              </q-item>
            </q-list>
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
const activeTab = ref('ledger')
const searchQuery = ref('')
const loading = ref(false)

const getTypeColor = (type) => {
  const map = {
    ASSET: 'cyan-4',
    LIABILITY: 'indigo-4',
    EQUITY: 'purple-4',
    REVENUE: 'green-4',
    EXPENSE: 'red-4'
  }
  return map[type] || 'grey-4'
}

const coaNodes = ref([])

const journalCols = [
  { name: 'id', label: 'JOURNAL ID', field: 'id', align: 'left' },
  { name: 'timestamp', label: 'TIMESTAMP', field: 'timestamp', align: 'left' },
  { name: 'description', label: 'DESCRIPTION', field: 'description', align: 'left' },
  { name: 'sourceTxnId', label: 'SOURCE TXN', field: 'sourceTxnId', align: 'left' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' }
]

const journals = ref([])

const ledgerCols = [
  { name: 'id', label: 'ENTRY ID', field: 'id', align: 'left' },
  { name: 'journalId', label: 'JOURNAL / REF', field: 'journalId', align: 'left' },
  { name: 'accountId', label: 'ACCOUNT / TENANT', field: 'accountId', align: 'left' },
  { name: 'debit', label: 'DEBIT', field: 'debit', align: 'right' },
  { name: 'credit', label: 'CREDIT', field: 'credit', align: 'right' },
  { name: 'timestamp', label: 'TIMESTAMP', field: 'timestamp', align: 'right' }
]

const ledgerEntries = ref([])
const batchExplorer = ref([])
const accountBalances = ref([])

const drawerOpen = ref(false)
const selectedLedger = ref(null)

const totals = computed(() => {
  let debits = 0
  let credits = 0
  for (const e of ledgerEntries.value) {
    const amt = Number(e.amount || 0)
    if (e.type === 'DEBIT') debits += amt
    else credits += amt
  }
  return { debits, credits, diff: debits - credits }
})

const parityLabel = computed(() => {
  if (!ledgerEntries.value.length) return 'N/A'
  return totals.value.diff === 0 ? 'BALANCED' : 'UNBALANCED'
})

function formatMoney(n) {
  const v = Number(n || 0)
  if (v >= 1_000_000_000) return B
  if (v >= 1_000_000) return M
  return v.toLocaleString()
}

function mapLedgerRow(row) {
  const amount = Number(row.amount || row.debit || row.credit || 0)
  const typeRaw = String(row.entry_type || row.type || (row.debit ? 'DEBIT' : 'CREDIT')).toUpperCase()
  const type = typeRaw.includes('DEB') ? 'DEBIT' : 'CREDIT'
  const tenantName = row.tenants?.name || row.tenant_name || null
  return {
    id: row.id,
    journalId: row.journal_id || row.reference || row.batch_id || '—',
    accountId: tenantName || row.account_code || row.account_id || row.tenant_id || '—',
    type,
    amount,
    timestamp: row.created_at || row.timestamp || null,
    flow: {
      debit: row.debit_account || row.description || (type === 'DEBIT' ? (tenantName || 'Debit') : '—'),
      credit: row.credit_account || row.description || (type === 'CREDIT' ? (tenantName || 'Credit') : '—')
    },
    related: {
      txn: row.payment_id || row.transaction_id || row.reference || null,
      set: row.settlement_batch_id || null,
      ten: row.tenant_id || null,
      wal: row.wallet_id || null,
      crd: row.card_id || null,
      term: row.terminal_id || null,
      aud: null
    },
    raw: row
  }
}

async function loadLedger() {
  loading.value = true
  try {
    const res = await adminApi.getLedger()
    const rows = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    ledgerEntries.value = rows.map(mapLedgerRow)

    const byRef = new Map()
    for (const e of ledgerEntries.value) {
      const key = e.journalId || e.id
      if (!byRef.has(key)) {
        byRef.set(key, {
          id: key,
          timestamp: e.timestamp,
          description: e.flow?.debit || e.flow?.credit || 'Ledger posting',
          sourceTxnId: e.related?.txn || '—',
          status: 'POSTED'
        })
      }
    }
    journals.value = [...byRef.values()]
    accountBalances.value = []
    batchExplorer.value = []
    coaNodes.value = []
  } catch (e) {
    console.error('[GlobalLedger] load failed:', e)
    ledgerEntries.value = []
    journals.value = []
    $q.notify({
      type: 'negative',
      message: e?.response?.data?.error || e?.response?.data?.message || 'Failed to load live ledger entries'
    })
  } finally {
    loading.value = false
  }
}

const inspectLedger = (row) => {
  selectedLedger.value = {
    ...row,
    flow: row.flow || { debit: '—', credit: '—' },
    related: row.related || {}
  }
  drawerOpen.value = true
}

const inspectJournal = (row) => {
  const match = ledgerEntries.value.find(e => e.journalId === row.id)
  if (match) inspectLedger(match)
}

onMounted(loadLedger)
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
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.drawer-shadow {
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
}

.hover-bg:hover {
  background: rgba(255, 255, 255, 0.03);
}

.border-cyan-left { border-left: 2px solid #22b8cf !important; }
.border-indigo-left { border-left: 2px solid #7048e8 !important; }
.border-amber-left { border-left: 2px solid #fcc419 !important; }
.border-green-left { border-left: 2px solid #51cf66 !important; }
.border-red-left { border-left: 2px solid #c92a2a !important; }
</style>
