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
            <span class="text-green-4 text-weight-bold">{{ currentCurrency.symbol }}5,000,000</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Total Credits:</span>
            <span class="text-amber-4 text-weight-bold">{{ currentCurrency.symbol }}5,000,000</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Difference:</span>
            <q-badge color="green-10" text-color="green-3">{{ currentCurrency.symbol }}0</q-badge>
          </div>
          <q-icon name="check_circle" color="green-4" size="sm" />
        </div>
      </div>

      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="account_balance" label="Run Trial Balance" class="text-caption text-weight-bold" />
        <q-btn size="xs" color="amber-4" icon="download" label="Export Ledger Data" class="text-caption text-weight-bold text-black" />
      </div>
    </div>

    <!-- KPIs -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left">
          <div class="text-operator-title text-muted">Total Ledger Assets</div>
          <div class="text-h4 text-metric-mono text-cyan-4">{{ currentCurrency.symbol }}4.2B <span class="text-caption text-muted">System Float</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left">
          <div class="text-operator-title text-muted">Tenant Liabilities</div>
          <div class="text-h4 text-metric-mono text-indigo-4">{{ currentCurrency.symbol }}3.8B <span class="text-caption text-muted">Held in Wallets</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left">
          <div class="text-operator-title text-muted">Daily Posting Volume</div>
          <div class="text-h4 text-metric-mono text-amber-5">1.2M <span class="text-caption text-muted">ENTRIES</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left">
          <div class="text-operator-title text-muted">Ledger Parity State</div>
          <div class="text-h4 text-metric-mono text-green-4">100% <span class="text-caption text-muted">MATCHED</span></div>
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
            <q-tree
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
            <div class="row q-col-gutter-md">
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
            <div class="row q-col-gutter-md">
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
              <div class="text-muted text-caption">{{ selectedLedger.flow.debit }}</div>
              <div class="text-green-4 text-weight-bold q-mt-xs">{{ currentCurrency.symbol }}{{ selectedLedger.amount.toLocaleString() }}</div>
            </div>
            <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-indigo-left" style="width: 280px;" v-else>
              <div class="text-indigo-4 text-weight-bold">Debit Origin</div>
              <div class="text-muted text-caption">{{ selectedLedger.flow.debit }}</div>
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
              <div class="text-muted text-caption">{{ selectedLedger.flow.credit }}</div>
              <div class="text-amber-4 text-weight-bold q-mt-xs">{{ currentCurrency.symbol }}{{ selectedLedger.amount.toLocaleString() }}</div>
            </div>
            <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-indigo-left" style="width: 280px;" v-else>
              <div class="text-indigo-4 text-weight-bold">Credit Destination</div>
              <div class="text-muted text-caption">{{ selectedLedger.flow.credit }}</div>
            </div>
          </div>

          <!-- Drill-Down Navigation -->
          <div class="text-operator-title text-muted q-mb-sm">Related Investigation Records</div>
          <div class="enterprise-subpanel border-muted rounded-borders font-mono text-caption q-mb-md">
            <q-list separator dark class="bg-transparent">
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related.txn">
                <q-item-section avatar><q-badge color="cyan-10" text-color="cyan-3">TXN</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-cyan-3">{{ selectedLedger.related.txn }}</q-item-label><q-item-label caption>Source Transaction</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related.set">
                <q-item-section avatar><q-badge color="indigo-10" text-color="indigo-3">SET</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-indigo-3">{{ selectedLedger.related.set }}</q-item-label><q-item-label caption>Settlement Batch</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related.ten">
                <q-item-section avatar><q-badge color="grey-9" text-color="grey-4">TEN</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-grey-4">{{ selectedLedger.related.ten }}</q-item-label><q-item-label caption>Tenant Record</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related.wal">
                <q-item-section avatar><q-badge color="blue-grey-10" text-color="blue-grey-3">WAL</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-blue-grey-3">{{ selectedLedger.related.wal }}</q-item-label><q-item-label caption>Wallet Entity</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related.crd">
                <q-item-section avatar><q-badge color="amber-10" text-color="amber-3">CRD</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-amber-3">{{ selectedLedger.related.crd }}</q-item-label><q-item-label caption>Card Instrument</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related.term">
                <q-item-section avatar><q-badge color="green-10" text-color="green-3">TRM</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-green-3">{{ selectedLedger.related.term }}</q-item-label><q-item-label caption>Terminal Device</q-item-label></q-item-section>
              </q-item>
              <q-item clickable v-ripple class="hover-bg" v-if="selectedLedger.related.aud">
                <q-item-section avatar><q-badge color="red-10" text-color="red-3">AUD</q-badge></q-item-section>
                <q-item-section><q-item-label class="text-red-3">{{ selectedLedger.related.aud }}</q-item-label><q-item-label caption>Audit Engine Log</q-item-label></q-item-section>
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

import { ref } from 'vue'

const activeTab = ref('coa')
const searchQuery = ref('')

// CHART OF ACCOUNTS DATA
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

const coaNodes = ref([
  {
    id: '1000-ASSETS',
    label: 'Platform Assets',
    icon: 'account_balance',
    color: 'cyan-4',
    type: 'ASSET',
    children: [
      { id: '1010-PLATFORM-FLOAT', label: 'Primary Payment Gateway Float', icon: 'account_balance_wallet', type: 'ASSET' },
      { id: '1020-SETTLEMENT-TRANSIT', label: 'In-Transit Settlement Funds', icon: 'sync_alt', type: 'ASSET' },
      { id: '1030-OPERATING-CASH', label: 'Invify Corporate Operating Cash', icon: 'monetization_on', type: 'ASSET' }
    ]
  },
  {
    id: '2000-LIABILITIES',
    label: 'Platform Liabilities',
    icon: 'credit_card',
    color: 'indigo-4',
    type: 'LIABILITY',
    children: [
      { id: '2010-MERCHANT-WALLET', label: 'Retail/School Tenant Wallets', icon: 'storefront', type: 'LIABILITY' },
      { id: '2020-STUDENT-WALLET', label: 'End-User/Student Wallets', icon: 'face', type: 'LIABILITY' },
      { id: '2030-PENDING-PAYOUT', label: 'Escrow Pending Disbursements', icon: 'payments', type: 'LIABILITY' }
    ]
  },
  {
    id: '3000-EQUITY',
    label: 'Platform Equity',
    icon: 'pie_chart',
    color: 'purple-4',
    type: 'EQUITY',
    children: [
      { id: '3010-RETAINED-EARNINGS', label: 'Retained Earnings', icon: 'trending_up', type: 'EQUITY' }
    ]
  },
  {
    id: '4000-REVENUE',
    label: 'Platform Revenue',
    icon: 'trending_up',
    color: 'green-4',
    type: 'REVENUE',
    children: [
      { id: '4010-PROCESSING-FEES', label: 'Transaction Processing Fees', icon: 'receipt', type: 'REVENUE' },
      { id: '4020-SUBSCRIPTION-REV', label: 'Tenant Subscription Revenue', icon: 'card_membership', type: 'REVENUE' }
    ]
  },
  {
    id: '5000-EXPENSES',
    label: 'Platform Expenses',
    icon: 'trending_down',
    color: 'red-4',
    type: 'EXPENSE',
    children: [
      { id: '5010-GATEWAY-COSTS', label: 'NIBSS/Switching Gateway Costs', icon: 'router', type: 'EXPENSE' },
      { id: '5020-SMS-COSTS', label: 'SMS Notification Costs', icon: 'sms', type: 'EXPENSE' }
    ]
  }
])

// JOURNAL EXPLORER DATA
const journalCols = [
  { name: 'id', label: 'JOURNAL ID', field: 'id', align: 'left' },
  { name: 'timestamp', label: 'TIMESTAMP', field: 'timestamp', align: 'left' },
  { name: 'description', label: 'DESCRIPTION', field: 'description', align: 'left' },
  { name: 'sourceTxnId', label: 'SOURCE TXN', field: 'sourceTxnId', align: 'left' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' }
]

const journals = ref([
  { id: 'jrn_992104', timestamp: new Date(Date.now() - 60000).toISOString(), description: 'Wallet Transfer Funding', sourceTxnId: 'tx_98A4F1B3E0C2', status: 'POSTED' },
  { id: 'jrn_992105', timestamp: new Date(Date.now() - 120000).toISOString(), description: 'POS Terminal Sale', sourceTxnId: 'tx_77B2C9D1E4A5', status: 'POSTED' },
  { id: 'jrn_992106', timestamp: new Date(Date.now() - 180000).toISOString(), description: 'Daily Settlement Sweeps', sourceTxnId: 'SYS_BATCH_SWEEP', status: 'PENDING' }
])

// LEDGER ENTRIES DATA
const ledgerCols = [
  { name: 'id', label: 'ENTRY ID', field: 'id', align: 'left' },
  { name: 'journalId', label: 'JOURNAL ID', field: 'journalId', align: 'left' },
  { name: 'accountId', label: 'ACCOUNT ID', field: 'accountId', align: 'left' },
  { name: 'debit', label: 'DEBIT', field: 'debit', align: 'right' },
  { name: 'credit', label: 'CREDIT', field: 'credit', align: 'right' },
  { name: 'timestamp', label: 'TIMESTAMP', field: 'timestamp', align: 'right' }
]

const ledgerEntries = ref([
  { 
    id: 'LED-2026-000001', journalId: 'jrn_992104', accountId: '1010-PLATFORM-FLOAT', type: 'DEBIT', amount: 45000, timestamp: new Date(Date.now() - 60000).toISOString(),
    flow: { debit: 'Parent Wallet (wal_par_9012)', credit: 'Student Wallet (wal_stu_7482)' },
    related: { txn: 'TXN-2026-100001', set: 'SET-2026-300001', ten: 'TEN-0001', wal: 'WAL-0005', crd: 'CARD-0008', term: 'TERM-0003', aud: 'AUD-0091' }
  },
  { 
    id: 'LED-2026-000002', journalId: 'jrn_992104', accountId: '2020-STUDENT-WALLET', type: 'CREDIT', amount: 45000, timestamp: new Date(Date.now() - 60000).toISOString(),
    flow: { debit: 'Parent Wallet (wal_par_9012)', credit: 'Student Wallet (wal_stu_7482)' },
    related: { txn: 'TXN-2026-100001', set: 'SET-2026-300001', ten: 'TEN-0001', wal: 'WAL-0005', aud: 'AUD-0092' }
  },
  { 
    id: 'LED-2026-000003', journalId: 'jrn_992105', accountId: '1010-PLATFORM-FLOAT', type: 'DEBIT', amount: 1250000, timestamp: new Date(Date.now() - 120000).toISOString(),
    flow: { debit: 'Customer Card (crd_virt_9941)', credit: 'Merchant Wallet (wal_mer_8832)' },
    related: { txn: 'TXN-2026-100002', set: 'SET-2026-300002', ten: 'TEN-0002', wal: 'WAL-0009', crd: 'CARD-9941', term: 'TERM-412', aud: 'AUD-0095' }
  },
  { 
    id: 'LED-2026-000004', journalId: 'jrn_992105', accountId: '2010-MERCHANT-WALLET', type: 'CREDIT', amount: 1250000, timestamp: new Date(Date.now() - 120000).toISOString(),
    flow: { debit: 'Customer Card (crd_virt_9941)', credit: 'Merchant Wallet (wal_mer_8832)' },
    related: { txn: 'TXN-2026-100002', set: 'SET-2026-300002', ten: 'TEN-0002', wal: 'WAL-0009', crd: 'CARD-9941', term: 'TERM-412', aud: 'AUD-0096' }
  }
])

// DRAWER STATE
const drawerOpen = ref(false)
const selectedLedger = ref(null)

const inspectLedger = (row) => {
  selectedLedger.value = row
  drawerOpen.value = true
}

// BATCH EXPLORER DATA
const batchExplorer = ref([
  { id: 'BATCH-20260531-001', entries: 500, debits: 10000000, credits: 10000000, status: 'Balanced' },
  { id: 'BATCH-20260531-002', entries: 125, debits: 3450000, credits: 3450000, status: 'Balanced' },
  { id: 'BATCH-20260531-003', entries: 80, debits: 1200000, credits: 1200000, status: 'Balanced' }
])

// ACCOUNT BALANCES DATA
const accountBalances = ref([
  { account: 'Student Wallet Float', type: 'LIABILITY', color: 'text-indigo-4', opening: 1000000, movement: 250000, closing: 1250000 },
  { account: 'Primary Gateway Float', type: 'ASSET', color: 'text-cyan-4', opening: 4200000000, movement: -1500000, closing: 4198500000 },
  { account: 'Transaction Fees', type: 'REVENUE', color: 'text-green-4', opening: 54000, movement: 12000, closing: 66000 }
])

</script>

<style scoped>
.transaction-table {
  /* Minimalist density matching enterprise look */
}
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

.hover-bg:hover {
  background: rgba(255, 255, 255, 0.03);
}

.border-cyan-left { border-left: 2px solid #22b8cf !important; }
.border-indigo-left { border-left: 2px solid #7048e8 !important; }
.border-amber-left { border-left: 2px solid #fcc419 !important; }
.border-green-left { border-left: 2px solid #51cf66 !important; }
.border-red-left { border-left: 2px solid #c92a2a !important; }
</style>
