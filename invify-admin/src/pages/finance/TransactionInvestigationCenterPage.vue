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
          MASTER_LEDGER_PARITY_CHECK: ENABLED
        </q-chip>
      </div>

      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="filter_list" label="Advanced Filters" class="text-caption text-weight-bold" />
        <q-btn size="xs" color="cyan-4" icon="download" label="Export Trace" class="text-caption text-weight-bold text-black" />
      </div>
    </div>

    <!-- KPIs -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left">
          <div class="text-operator-title text-muted">Real-Time Volume</div>
          <div class="text-h4 text-metric-mono text-cyan-4">12,408 <span class="text-caption text-muted">TPS</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left">
          <div class="text-operator-title text-muted">Pending Reconciliation</div>
          <div class="text-h4 text-metric-mono text-indigo-4">142 <span class="text-caption text-muted">TXNs</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left">
          <div class="text-operator-title text-muted">Elevated Risk Scores (>75)</div>
          <div class="text-h4 text-metric-mono text-amber-5">18 <span class="text-caption text-muted">FLAGS</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left">
          <div class="text-operator-title text-muted">Unmapped Ledger Entries</div>
          <div class="text-h4 text-metric-mono text-red-5">0 <span class="text-caption text-muted">ANOMALIES</span></div>
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
        <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search TXN ID, Wallet, or Device..." class="text-caption" style="width: 300px;">
          <template v-slot:append>
            <q-icon name="search" color="grey-5" />
          </template>
        </q-input>
      </div>

      <q-table
        class="bg-transparent text-main flex-grow-1 transaction-table"
        flat
        :rows="transactions"
        :columns="columns"
        row-key="id"
        :pagination="pagination"
        dense
        virtual-scroll
        style="height: 100%;"
      >
        <template v-slot:body-cell-id="props">
          <q-td :props="props" class="font-mono text-cyan-3 cursor-pointer" @click="inspectTransaction(props.row)">
            {{ props.value }}
          </q-td>
        </template>
        
        <template v-slot:body-cell-amount="props">
          <q-td :props="props" class="font-mono text-weight-bold" :class="props.row.type === 'CREDIT' ? 'text-green-4' : 'text-amber-4'">
            {{ props.row.type === 'CREDIT' ? '+' : '-' }}{{ currentCurrency.symbol }}{{ props.value.toLocaleString() }}
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
            <q-badge :color="props.value === 'MATCHED' ? 'green-10' : 'amber-10'" :text-color="props.value === 'MATCHED' ? 'green-3' : 'amber-3'">
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
      </q-table>
    </div>

    <!-- Deep Inspection Drawer -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="850">
      <div v-if="selectedTx" class="column full-height">
        
        <!-- Drawer Header & Health -->
        <div class="q-pa-md border-bottom bg-subpanel">
          <div class="row justify-between items-start q-mb-md">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="cyan-10" text-color="cyan-3" label="TXN INVESTIGATION" />
                <div class="text-h5 font-mono text-main">{{ selectedTx.id }}</div>
              </div>
              <div class="text-caption text-muted font-mono">Ledger Batch: {{ selectedTx.ledgerBatchId }} | Target: {{ selectedTx.walletId }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- Transaction Health Pipeline -->
          <div class="text-operator-title text-muted q-mb-sm">Transaction Health Status</div>
          <div class="row items-center op-gap-12 font-mono text-caption">
            <div class="row items-center op-gap-4"><q-icon name="check_circle" color="green-4" size="xs" /><span class="text-white">Created</span></div>
            <div class="text-muted">→</div>
            <div class="row items-center op-gap-4"><q-icon name="check_circle" color="green-4" size="xs" /><span class="text-white">Ledger Posted</span></div>
            <div class="text-muted">→</div>
            <div class="row items-center op-gap-4"><q-icon name="check_circle" color="green-4" size="xs" /><span class="text-white">Reconciled</span></div>
            <div class="text-muted">→</div>
            <div class="row items-center op-gap-4"><q-icon name="check_circle" color="green-4" size="xs" /><span class="text-white">Settlement Gen</span></div>
            <div class="text-muted">→</div>
            <div class="row items-center op-gap-4"><q-icon name="warning" color="amber-4" size="xs" /><span class="text-amber-4">Notification Failed</span></div>
          </div>
        </div>

        <!-- Action Center -->
        <div class="q-px-md q-py-sm border-bottom bg-dark row items-center op-gap-8">
          <q-btn size="sm" outline color="cyan-4" icon="account_balance_wallet" label="View Ledger" />
          <q-btn size="sm" outline color="indigo-4" icon="payments" label="View Settlement" />
          <q-btn size="sm" outline color="grey-5" icon="history" label="Audit Trail" />
          <q-btn size="sm" outline color="grey-5" icon="download" label="Export" />
          <q-space />
          <q-btn size="sm" color="amber-10" text-color="amber-3" icon="gavel" label="Raise Dispute" class="q-mr-sm" />
          <q-btn size="sm" color="red-10" text-color="red-3" icon="lock" label="Freeze Wallet" />
        </div>

        <!-- Drawer Tabs -->
        <q-tabs v-model="activeTab" dense class="text-grey-5 border-bottom bg-subpanel" active-color="cyan-4" indicator-color="cyan-4" align="left" narrow-indicator>
          <q-tab name="overview" label="Overview" />
          <q-tab name="timeline" label="Timeline" />
          <q-tab name="flow" label="Financial Flow" />
          <q-tab name="related" label="Related Records" />
          <q-tab name="ledger" label="Ledger" />
          <q-tab name="settlement" label="Settlement" />
          <q-tab name="recon" label="Recon" />
          <q-tab name="audit" label="Audit" />
        </q-tabs>

        <!-- Drawer Content -->
        <q-scroll-area class="col q-pa-md">
          <q-tab-panels v-model="activeTab" animated class="bg-transparent">
            
            <!-- OVERVIEW -->
            <q-tab-panel name="overview" class="q-pa-none">
              <div class="row q-col-gutter-md">
                
                <!-- Financial Core -->
                <div class="col-12 col-md-6">
                  <div class="text-operator-title text-muted q-mb-sm">Financial Core</div>
                  <div class="enterprise-subpanel q-pa-sm border-muted rounded-borders font-mono text-caption">
                    <div class="row justify-between q-mb-xs"><span>Amount:</span> <span class="text-white text-h6" style="line-height:1">{{ currentCurrency.symbol }}{{ selectedTx.amount.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mb-xs"><span>Currency:</span> <span class="text-white">NGN</span></div>
                    <div class="row justify-between q-mb-xs"><span>Type:</span> <span :class="selectedTx.type === 'CREDIT' ? 'text-green-4' : 'text-amber-4'">{{ selectedTx.type }}</span></div>
                    <div class="row justify-between q-mb-xs"><span>Channel:</span> <span class="text-white">{{ selectedTx.channel }}</span></div>
                  </div>
                </div>

                <!-- Tenant Context -->
                <div class="col-12 col-md-6">
                  <div class="text-operator-title text-muted q-mb-sm">Tenant Context</div>
                  <div class="enterprise-subpanel q-pa-sm border-muted rounded-borders font-mono text-caption">
                    <div class="row justify-between q-mb-xs"><span>Tenant ID:</span> <span class="text-cyan-3">{{ selectedTx.tenantId }}</span></div>
                    <div class="row justify-between q-mb-xs"><span>Name:</span> <span class="text-white">Future Leaders Academy</span></div>
                    <div class="row justify-between q-mb-xs"><span>Type:</span> <span class="text-white">{{ selectedTx.tenantType }}</span></div>
                    <div class="row justify-between q-mb-xs"><span>Wallet Bal:</span> <span class="text-green-4">{{ currentCurrency.symbol }}2,500,000</span></div>
                  </div>
                </div>

                <!-- Device & Terminal Context -->
                <div class="col-12 col-md-6">
                  <div class="text-operator-title text-muted q-mb-sm">Device & Terminal Context</div>
                  <div class="enterprise-subpanel q-pa-sm border-muted rounded-borders font-mono text-caption">
                    <div class="row justify-between q-mb-xs"><span>Origin Device:</span> <span class="text-blue-grey-3">{{ selectedTx.deviceId || 'MOBI-XR92' }}</span></div>
                    <div class="row justify-between q-mb-xs"><span>Terminal ID:</span> <span class="text-blue-grey-3">{{ selectedTx.terminalId || 'POS-2091A' }}</span></div>
                    <div class="row justify-between q-mb-xs"><span>MPOS Status:</span> <span class="text-green-4">Active</span></div>
                    <div class="row justify-between q-mb-xs"><span>Last Sync:</span> <span class="text-muted">2 mins ago</span></div>
                  </div>
                </div>

                <!-- Fraud & Risk Visual Card -->
                <div class="col-12 col-md-6">
                  <div class="text-operator-title text-muted q-mb-sm">Fraud & Intelligence Engine</div>
                  <div class="enterprise-subpanel q-pa-sm border-muted rounded-borders font-mono text-caption" :class="selectedTx.riskScore > 70 ? 'border-red-left bg-red-10' : 'border-green-left'">
                    <div class="row justify-between q-mb-sm">
                      <span>Risk Score:</span> 
                      <span class="text-weight-bold" :class="selectedTx.riskScore > 70 ? 'text-red-2 text-h6' : 'text-green-4 text-h6'" style="line-height:1">{{ selectedTx.riskScore }}/100</span>
                    </div>
                    <div class="row justify-between q-mb-xs">
                      <span>Anomaly Score:</span> 
                      <span class="text-white">{{ selectedTx.anomalyScore }}</span>
                    </div>
                    <q-separator dark class="q-my-sm opacity-50" />
                    <div>
                      <div class="q-mb-xs">Fraud Flags:</div>
                      <div v-if="selectedTx.fraudFlags === 0" class="text-green-4">✓ No Anomalies Detected</div>
                      <div v-else class="column op-gap-4">
                        <div class="text-red-2 row items-center op-gap-4"><q-icon name="warning" /> Velocity Breach (3x/min)</div>
                        <div class="text-red-2 row items-center op-gap-4"><q-icon name="warning" /> Duplicate Payment Pattern</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </q-tab-panel>

            <!-- TIMELINE -->
            <q-tab-panel name="timeline" class="q-pa-none">
              <div class="text-operator-title text-muted q-mb-sm">Transaction Lifecycle Timeline</div>
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders">
                <q-timeline color="cyan-4" layout="dense" class="font-mono text-caption">
                  <q-timeline-entry title="Transaction Created" subtitle="10:01:22" icon="add_circle" />
                  <q-timeline-entry title="Wallet Debited" subtitle="10:01:23" icon="account_balance_wallet" />
                  <q-timeline-entry title="Ledger Posted" subtitle="10:01:23" icon="menu_book" color="amber-4" />
                  <q-timeline-entry title="Settlement Batch Assigned" subtitle="10:01:25" icon="payments" color="indigo-4" />
                  <q-timeline-entry title="Notification Sent" subtitle="10:01:27" icon="notifications" color="red-4" body="Failed to deliver webhook to tenant." />
                  <q-timeline-entry title="Transaction Completed" subtitle="10:01:29" icon="check_circle" color="green-4" />
                </q-timeline>
              </div>
            </q-tab-panel>

            <!-- FINANCIAL FLOW -->
            <q-tab-panel name="flow" class="q-pa-none">
              <div class="text-operator-title text-muted q-mb-sm">Financial Flow Visualization</div>
              <div class="enterprise-subpanel q-pa-lg border-muted rounded-borders flex flex-center column font-mono">
                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center" style="width: 250px;">
                  <div class="text-amber-4 text-weight-bold">Parent Wallet</div>
                  <div class="text-muted text-caption">wal_par_9012</div>
                </div>
                <div class="q-py-sm"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>
                
                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center" style="width: 250px;">
                  <div class="text-cyan-4 text-weight-bold">Student Wallet</div>
                  <div class="text-muted text-caption">wal_stu_7482</div>
                </div>
                <div class="q-py-sm"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>

                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-amber-left" style="width: 250px;">
                  <div class="text-indigo-4 text-weight-bold">School Wallet (Tenant)</div>
                  <div class="text-muted text-caption">tnt_edu_9421</div>
                </div>
                <div class="q-py-sm"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>

                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center" style="width: 250px;">
                  <div class="text-green-4 text-weight-bold">Settlement Batch</div>
                  <div class="text-muted text-caption">stl_batch_4401</div>
                </div>
                <div class="q-py-sm"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>

                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center" style="width: 250px;">
                  <div class="text-white text-weight-bold">Bank Account</div>
                  <div class="text-muted text-caption">GTB - 0123456789</div>
                </div>
              </div>
            </q-tab-panel>

            <!-- RELATED RECORDS -->
            <q-tab-panel name="related" class="q-pa-none">
              <div class="text-operator-title text-muted q-mb-sm">Related Investigation Records</div>
              <div class="enterprise-subpanel border-muted rounded-borders font-mono text-caption">
                <q-list separator dark class="bg-transparent">
                  <q-item clickable v-ripple class="hover-bg">
                    <q-item-section avatar><q-badge color="cyan-10" text-color="cyan-3">TXN</q-badge></q-item-section>
                    <q-item-section><q-item-label class="text-cyan-3">{{ selectedTx.id }}</q-item-label><q-item-label caption>Original Payment</q-item-label></q-item-section>
                  </q-item>
                  <q-item clickable v-ripple class="hover-bg">
                    <q-item-section avatar><q-badge color="amber-10" text-color="amber-3">LED</q-badge></q-item-section>
                    <q-item-section><q-item-label class="text-amber-3">LED-2001, LED-2002</q-item-label><q-item-label caption>Double-Entry Postings</q-item-label></q-item-section>
                  </q-item>
                  <q-item clickable v-ripple class="hover-bg">
                    <q-item-section avatar><q-badge color="indigo-10" text-color="indigo-3">SET</q-badge></q-item-section>
                    <q-item-section><q-item-label class="text-indigo-3">{{ selectedTx.settlementBatchId }}</q-item-label><q-item-label caption>Settlement Record</q-item-label></q-item-section>
                  </q-item>
                  <q-item clickable v-ripple class="hover-bg">
                    <q-item-section avatar><q-badge color="grey-9" text-color="grey-4">AUD</q-badge></q-item-section>
                    <q-item-section><q-item-label class="text-grey-4">AUD-4001</q-item-label><q-item-label caption>Compliance Audit Event</q-item-label></q-item-section>
                  </q-item>
                  <q-item clickable v-ripple class="hover-bg">
                    <q-item-section avatar><q-badge color="red-10" text-color="red-3">NOT</q-badge></q-item-section>
                    <q-item-section><q-item-label class="text-red-3">NOT-5001</q-item-label><q-item-label caption>Failed Webhook Delivery</q-item-label></q-item-section>
                  </q-item>
                </q-list>
              </div>
            </q-tab-panel>

            <!-- LEDGER ENTRIES -->
            <q-tab-panel name="ledger" class="q-pa-none">
              <div class="text-operator-title text-muted q-mb-sm">Double-Entry Postings (Immutable)</div>
              <div class="enterprise-subpanel border-muted rounded-borders overflow-hidden">
                <table class="full-width text-left font-mono text-caption" style="border-collapse: collapse;">
                  <thead class="bg-dark text-grey-5 border-bottom">
                    <tr>
                      <th class="q-pa-sm">Account</th>
                      <th class="q-pa-sm">Type</th>
                      <th class="q-pa-sm text-right">Debit</th>
                      <th class="q-pa-sm text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-bottom hover-bg">
                      <td class="q-pa-sm text-cyan-3">1010-PLATFORM-FLOAT</td>
                      <td class="q-pa-sm">Asset</td>
                      <td class="q-pa-sm text-right text-green-4">{{ currentCurrency.symbol }}{{ selectedTx.amount.toLocaleString() }}</td>
                      <td class="q-pa-sm text-right text-muted">-</td>
                    </tr>
                    <tr class="hover-bg">
                      <td class="q-pa-sm text-indigo-3">2020-TENANT-WALLET</td>
                      <td class="q-pa-sm">Liability</td>
                      <td class="q-pa-sm text-right text-muted">-</td>
                      <td class="q-pa-sm text-right text-amber-4">{{ currentCurrency.symbol }}{{ selectedTx.amount.toLocaleString() }}</td>
                    </tr>
                  </tbody>
                  <tfoot class="bg-dark border-top text-weight-bold">
                    <tr>
                      <td colspan="2" class="q-pa-sm">PARITY CHECK: MATCHED</td>
                      <td class="q-pa-sm text-right">{{ currentCurrency.symbol }}{{ selectedTx.amount.toLocaleString() }}</td>
                      <td class="q-pa-sm text-right">{{ currentCurrency.symbol }}{{ selectedTx.amount.toLocaleString() }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </q-tab-panel>

            <!-- SETTLEMENT -->
            <q-tab-panel name="settlement" class="q-pa-none">
              <div class="text-operator-title text-muted q-mb-sm">Settlement Orchestration</div>
              <div class="enterprise-subpanel q-pa-sm border-muted rounded-borders font-mono text-caption">
                <div class="row justify-between q-mb-xs"><span>Status:</span> <q-badge color="indigo-10" text-color="indigo-3">{{ selectedTx.settlementStatus }}</q-badge></div>
                <div class="row justify-between q-mb-xs"><span>Batch ID:</span> <span class="text-indigo-3">{{ selectedTx.settlementBatchId }}</span></div>
                <div class="row justify-between q-mb-xs"><span>Gateway:</span> <span class="text-white">NIBSS-NIP</span></div>
                <div class="row justify-between"><span>Clearing Timestamp:</span> <span class="text-muted">Pending EOD</span></div>
              </div>
            </q-tab-panel>

            <!-- RECONCILIATION -->
            <q-tab-panel name="recon" class="q-pa-none">
              <div class="text-operator-title text-muted q-mb-sm">Reconciliation Engine Trace</div>
              <div class="text-caption text-muted italic">Awaiting external bank statement MT940 parsing for parity validation.</div>
            </q-tab-panel>
            
            <q-tab-panel name="audit" class="q-pa-none">
              <div class="text-operator-title text-muted q-mb-sm">Audit Engine Trace</div>
              <div class="text-caption text-muted italic">Immutable operational traces mapped successfully.</div>
            </q-tab-panel>

          </q-tab-panels>
        </q-scroll-area>
      </div>
    </q-drawer>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, computed } from 'vue'

const searchQuery = ref('')
const drawerOpen = ref(false)
const activeTab = ref('overview')
const selectedTx = ref(null)

const pagination = ref({ rowsPerPage: 15 })

const columns = [
  { name: 'id', label: 'TXN ID', field: 'id', align: 'left' },
  { name: 'timestamp', label: 'TIMESTAMP', field: 'timestamp', align: 'left' },
  { name: 'tenantId', label: 'TENANT ID', field: 'tenantId', align: 'left' },
  { name: 'amount', label: 'AMOUNT', field: 'amount', align: 'right' },
  { name: 'channel', label: 'CHANNEL', field: 'channel', align: 'center' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' },
  { name: 'fraudFlags', label: 'FRAUD FLAGS', field: 'fraudFlags', align: 'center' },
  { name: 'reconciliationStatus', label: 'RECON STATUS', field: 'reconciliationStatus', align: 'center' },
  { name: 'actions', label: '', field: 'actions', align: 'right' }
]

// Production-grade simulated data strictly adhering to the requested schema
const transactions = ref([
  {
    id: 'tx_98A4F1B3E0C2',
    tenantId: 'tnt_edu_9421',
    tenantType: 'School',
    walletId: 'wal_stu_7482',
    cardId: null,
    deviceId: 'dev_mobi_119',
    terminalId: null,
    settlementBatchId: 'stl_batch_4401',
    ledgerBatchId: 'ldg_batch_9921',
    riskScore: 12,
    anomalyScore: 0.04,
    fraudFlags: 0,
    reconciliationStatus: 'MATCHED',
    settlementStatus: 'QUEUED',
    amount: 45000,
    type: 'CREDIT',
    channel: 'Wallet Transfer',
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString()
  },
  {
    id: 'tx_77B2C9D1E4A5',
    tenantId: 'tnt_ret_5521',
    tenantType: 'Retail',
    walletId: 'wal_mer_8832',
    cardId: 'crd_virt_9941',
    deviceId: null,
    terminalId: 'term_pos_412',
    settlementBatchId: 'stl_batch_4401',
    ledgerBatchId: 'ldg_batch_9922',
    riskScore: 84,
    anomalyScore: 0.92,
    fraudFlags: 2,
    reconciliationStatus: 'PENDING',
    settlementStatus: 'HELD',
    amount: 1250000,
    type: 'CREDIT',
    channel: 'POS Terminal',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    id: 'tx_33C9F2A1D0B7',
    tenantId: 'tnt_srv_1102',
    tenantType: 'Service',
    walletId: 'wal_mer_2210',
    cardId: null,
    deviceId: null,
    terminalId: null,
    settlementBatchId: 'stl_batch_4400',
    ledgerBatchId: 'ldg_batch_9918',
    riskScore: 5,
    anomalyScore: 0.01,
    fraudFlags: 0,
    reconciliationStatus: 'MATCHED',
    settlementStatus: 'SETTLED',
    amount: 8500,
    type: 'DEBIT',
    channel: 'Bank Transfer',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  }
])

const inspectTransaction = (row) => {
  selectedTx.value = row
  activeTab.value = 'overview'
  drawerOpen.value = true
}

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

.drawer-shadow {
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
}

.hover-bg:hover {
  background: rgba(255, 255, 255, 0.03);
}

.border-cyan-left { border-left: 2px solid #22b8cf !important; }
.border-indigo-left { border-left: 2px solid #7048e8 !important; }
.border-amber-left { border-left: 2px solid #fcc419 !important; }
.border-red-left { border-left: 2px solid #c92a2a !important; }
</style>
