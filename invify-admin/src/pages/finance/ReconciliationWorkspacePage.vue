<!-- invify-admin/src/pages/finance/ReconciliationWorkspacePage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Health Score -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Finance Foundation Layer</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Reconciliation Command Center
          </div>
        </div>

        <!-- Health Score Panel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 20px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Recon Health:</span>
            <span class="text-green-4 text-weight-bold text-subtitle2">99.8%</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Status:</span>
            <q-badge color="green-10" text-color="green-3">Healthy</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Active Alerts:</span>
            <span class="text-amber-4 text-weight-bold">3</span>
          </div>
          <q-icon name="monitor_heart" color="green-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh Data" class="text-caption text-weight-bold" />
        <q-btn outline size="xs" color="grey-6" icon="rule" label="Rule Center" class="text-caption text-weight-bold" @click="activeWorkspaceTab = 'rules'" />
        <q-btn-dropdown size="xs" color="amber-4" icon="download" label="Export" class="text-caption text-weight-bold text-black" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Export Results (CSV)</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Export Exceptions (Excel)</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Export Mismatches (PDF)</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Full Report</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- KPI Dashboard -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Reconciliation Rate</div>
          <div class="text-h5 text-metric-mono text-green-4">{{ summaryStats.reconciliationRate }}% <q-icon name="trending_up" size="xs"/></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Matched</div>
          <div class="text-h5 text-metric-mono text-cyan-4">{{ summaryStats.matched }}</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Pending Match</div>
          <div class="text-h5 text-metric-mono text-amber-5">{{ summaryStats.unmatched }}</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Mismatch Amount</div>
          <div class="text-h5 text-metric-mono text-red-4">{{ currentCurrency.symbol }}{{ summaryStats.mismatchAmount.toLocaleString() }}</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg" @click="activeWorkspaceTab = 'exceptions'">
          <div class="text-operator-title text-muted">Exceptions / Issues</div>
          <div class="text-h5 text-metric-mono text-indigo-4">{{ summaryStats.issues }}</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-purple-left cursor-pointer hover-bg" @click="activeWorkspaceTab = 'missing'">
          <div class="text-operator-title text-muted">Missing Settlements</div>
          <div class="text-h5 text-metric-mono text-purple-4">0</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Queue Tabs & Command Bar Search -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-sm">
        <q-tabs v-model="activeWorkspaceTab" dense class="text-grey-5" active-color="amber-4" indicator-color="amber-4" align="left">
          <q-tab name="queues" label="Recon Queues" icon="dynamic_feed" />
          <q-tab name="exceptions" label="Exception Center" icon="error_outline" />
          <q-tab name="duplicates" label="Duplicate Detection" icon="file_copy" />
          <q-tab name="missing" label="Missing Settlements" icon="find_in_page" />
          <q-tab name="rules" label="Auto-Recon Rules" icon="account_tree" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="filter_list" color="grey-5" size="sm"><q-tooltip>Advanced Filters</q-tooltip></q-btn>
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search TXN, SET, LED, WAL, REF..." class="text-caption" style="width: 280px;">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeWorkspaceTab" animated class="bg-transparent col" keep-alive>
        
        <!-- QUEUES PANEL (Grid) -->
        <q-tab-panel name="queues" class="q-pa-none column no-wrap">
          <div class="bg-subpanel border-bottom">
            <q-tabs v-model="activeQueueTab" dense class="text-grey-5 font-mono text-caption" active-color="cyan-4" align="left" no-caps>
              <q-tab name="matched" label="Matched (1.2M)" />
              <q-tab name="pending" label="Pending (4.3K)" />
              <q-tab name="mismatch" label="Mismatch (42)" />
              <q-tab name="failed" label="Failed (15)" />
              <q-tab name="investigations" label="Investigations (8)" />
            </q-tabs>
          </div>
          
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="reconRecords"
            :columns="reconCols"
            row-key="id"
            dense
            virtual-scroll
            style="height: 100%;"
            selection="multiple"
            v-model:selected="selectedRecords"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-amber-3 cursor-pointer text-weight-bold hover-underline" @click="inspectRecon(props.row)">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="getStatusColor(props.value)" text-color="dark" class="text-weight-bold">
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>
            <template v-slot:body-cell-difference="props">
              <q-td :props="props" class="font-mono text-weight-bold" :class="props.value === 0 ? 'text-green-4' : 'text-red-4'">
                {{ props.value === 0 ? '₦0' : currentCurrency.symbol + props.value.toLocaleString() }}
              </q-td>
            </template>
            <template v-slot:body-cell-riskScore="props">
              <q-td :props="props" class="font-mono text-center">
                <q-circular-progress
                  show-value
                  class="text-caption text-white"
                  :value="props.value"
                  size="24px"
                  :color="props.value > 80 ? 'red-5' : (props.value > 40 ? 'amber-5' : 'green-5')"
                  track-color="dark"
                  thickness="0.3"
                >
                  {{ props.value }}
                </q-circular-progress>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- EXCEPTION CENTER -->
        <q-tab-panel name="exceptions" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Exception Management Center</div>
          <div class="row q-col-gutter-md">
            <div class="col-12" v-for="exc in exceptions" :key="exc.id">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders border-red-left">
                <div class="row justify-between items-center q-mb-sm">
                  <div class="row items-center op-gap-8">
                    <q-badge color="red-10" text-color="red-3">EXCEPTION</q-badge>
                    <div class="text-weight-bold font-mono text-red-3">{{ exc.id }}</div>
                    <div class="text-muted text-caption">{{ exc.type }}</div>
                  </div>
                  <div class="row items-center op-gap-8">
                    <q-btn outline size="xs" color="amber-4" label="Assign" />
                    <q-btn size="xs" color="indigo-4" label="Investigate" @click="inspectRecon(exc.reconRecord)" />
                  </div>
                </div>
                <div class="text-caption text-grey-4">{{ exc.description }}</div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- DUPLICATE DETECTION -->
        <q-tab-panel name="duplicates" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Duplicate Detection Queue</div>
          <div class="text-caption text-muted q-mb-md">Auto-flagged potential duplicates based on Amount, Reference, and Time Similarity thresholds.</div>
          <!-- Placeholder for Duplicate List -->
          <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center">
            <div class="text-center font-mono">
              <q-icon name="file_copy" color="amber-5" size="lg" class="q-mb-sm" />
              <div>1 Potential Duplicate Group Detected</div>
            </div>
          </div>
        </q-tab-panel>

        <!-- MISSING SETTLEMENTS -->
        <q-tab-panel name="missing" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Missing Settlement Queue</div>
          <!-- Placeholder -->
        </q-tab-panel>

        <!-- AUTO-RECON RULES -->
        <q-tab-panel name="rules" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Auto-Reconciliation Rule Center</div>
          <!-- Placeholder -->
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- RECONCILIATION DETAIL DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="800">
      <div v-if="selectedRecon" class="column full-height">
        
        <!-- Drawer Header & Action Center -->
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="cyan-10" text-color="cyan-3" label="RECONCILIATION COMMAND" />
                <div class="text-h5 font-mono text-main">{{ selectedRecon.id }}</div>
                <q-badge :color="getStatusColor(selectedRecon.status)" text-color="dark">{{ selectedRecon.status }}</q-badge>
              </div>
              <div class="text-caption text-muted font-mono">Created: {{ selectedRecon.createdDate }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- Operational Action Center -->
          <div class="row items-center op-gap-8 bg-dark q-pa-sm rounded-borders border-muted">
            <div class="text-caption font-mono text-muted q-mr-sm">ACTIONS:</div>
            <q-btn outline size="xs" color="cyan-4" icon="receipt_long" label="Open Ledger" @click="drawerTab = 'ledger'" />
            <q-btn outline size="xs" color="indigo-4" icon="account_balance" label="Open Settlement" @click="drawerTab = 'settlement'" />
            <q-btn outline size="xs" color="amber-4" icon="person_add" label="Assign" @click="executeCommand('assign')" />
            <q-btn outline size="xs" color="red-4" icon="gavel" label="Escalate" @click="executeCommand('escalate')" />
            <q-space />
            <q-btn size="xs" color="green-4" text-color="dark" icon="check_circle" label="Force Match" v-if="selectedRecon.status !== 'MATCHED'" @click="executeCommand('forceMatch')" />
          </div>
        </div>

        <!-- Drawer Tabs -->
        <q-tabs v-model="drawerTab" dense class="text-grey-5 font-mono text-caption border-bottom" active-color="amber-4" align="left" no-caps>
          <q-tab name="overview" label="Overview" />
          <q-tab name="flow" label="Financial Flow" />
          <q-tab name="ledger" label="Ledger" />
          <q-tab name="settlement" label="Settlement" />
          <q-tab name="wallet" label="Wallet" />
          <q-tab name="card" label="Card" />
          <q-tab name="bank" label="Bank" />
          <q-tab name="audit" label="Audit" />
          <q-tab name="timeline" label="Timeline" />
          <q-tab name="related" label="Related" />
          <q-tab name="risk" label="Risk" />
          <q-tab name="resolution" label="Resolution" />
        </q-tabs>

        <q-scroll-area class="col">
          <q-tab-panels v-model="drawerTab" animated class="bg-transparent" keep-alive>
            
            <!-- OVERVIEW -->
            <q-tab-panel name="overview" class="q-pa-md column op-gap-16">
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Reconciliation Integrity</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Expected Amount:</span><span class="text-main">{{ currentCurrency.symbol }}{{ selectedRecon.expectedAmount.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Actual Amount:</span><span class="text-main">{{ currentCurrency.symbol }}{{ selectedRecon.actualAmount.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mt-sm border-top q-pt-sm font-mono text-weight-bold"><span class="text-muted">Difference:</span><span :class="selectedRecon.difference === 0 ? 'text-green-4' : 'text-red-4'">{{ currentCurrency.symbol }}{{ selectedRecon.difference.toLocaleString() }}</span></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Investigation Metadata</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Assigned To:</span><span class="text-main">Unassigned</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Priority:</span><span class="text-amber-4">High</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Risk Rating:</span><span class="text-red-4">Elevated</span></div>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- FINANCIAL FLOW -->
            <q-tab-panel name="flow" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono">
                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-cyan-left" style="width: 300px;">
                  <div class="text-cyan-4 text-weight-bold">Wallet / Card Origin</div>
                  <div class="text-muted text-caption">{{ selectedRecon.walletId || selectedRecon.cardId || 'Unknown Source' }}</div>
                </div>
                <div class="q-py-xs"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>
                
                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-amber-left" style="width: 300px;">
                  <div class="text-amber-4 text-weight-bold">Invify Master Ledger</div>
                  <div class="text-muted text-caption">Batch: {{ selectedRecon.ledgerBatchId }}</div>
                </div>
                <div class="q-py-xs"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>

                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-indigo-left" style="width: 300px;">
                  <div class="text-indigo-4 text-weight-bold">Settlement Engine</div>
                  <div class="text-muted text-caption">Batch: {{ selectedRecon.settlementBatchId }}</div>
                </div>
                <div class="q-py-xs"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>

                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-green-left" style="width: 300px;">
                  <div class="text-green-4 text-weight-bold">Bank Account Destination</div>
                  <div class="text-muted text-caption">Awaiting Match</div>
                </div>
              </div>
            </q-tab-panel>

            <!-- RELATED RECORDS -->
            <q-tab-panel name="related" class="q-pa-md column">
              <div class="enterprise-subpanel border-muted rounded-borders font-mono text-caption">
                <q-list separator dark class="bg-transparent">
                  <q-item clickable v-ripple class="hover-bg"><q-item-section avatar><q-badge color="cyan-10" text-color="cyan-3">TXN</q-badge></q-item-section><q-item-section><q-item-label class="text-cyan-3">{{ selectedRecon.txnId }}</q-item-label><q-item-label caption>Source Transaction</q-item-label></q-item-section></q-item>
                  <q-item clickable v-ripple class="hover-bg"><q-item-section avatar><q-badge color="amber-10" text-color="amber-3">LED</q-badge></q-item-section><q-item-section><q-item-label class="text-amber-3">{{ selectedRecon.ledgerBatchId }}</q-item-label><q-item-label caption>Ledger Batch</q-item-label></q-item-section></q-item>
                  <q-item clickable v-ripple class="hover-bg"><q-item-section avatar><q-badge color="indigo-10" text-color="indigo-3">SET</q-badge></q-item-section><q-item-section><q-item-label class="text-indigo-3">{{ selectedRecon.settlementBatchId }}</q-item-label><q-item-label caption>Settlement Batch</q-item-label></q-item-section></q-item>
                  <q-item clickable v-ripple class="hover-bg" v-if="selectedRecon.walletId"><q-item-section avatar><q-badge color="blue-grey-10" text-color="blue-grey-3">WAL</q-badge></q-item-section><q-item-section><q-item-label class="text-blue-grey-3">{{ selectedRecon.walletId }}</q-item-label><q-item-label caption>Wallet Entity</q-item-label></q-item-section></q-item>
                </q-list>
              </div>
            </q-tab-panel>

            <!-- RISK ANALYSIS -->
            <q-tab-panel name="risk" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row items-center op-gap-8 q-mb-md">
                  <q-circular-progress show-value class="text-caption text-white" :value="selectedRecon.riskScore" size="50px" :color="selectedRecon.riskScore > 80 ? 'red-5' : 'green-5'" track-color="dark" thickness="0.3">{{ selectedRecon.riskScore }}</q-circular-progress>
                  <div>
                    <div class="text-weight-bold">Risk Assessment</div>
                    <div class="text-caption text-muted">AI Anomaly Score: {{ selectedRecon.anomalyScore }}</div>
                  </div>
                </div>
                <div class="text-caption text-muted border-bottom q-pb-xs q-mb-sm">Fraud Flags Detected</div>
                <div class="row op-gap-8">
                  <q-badge color="red-10" text-color="red-3" v-for="flag in selectedRecon.fraudFlags" :key="flag">{{ flag }}</q-badge>
                  <span v-if="!selectedRecon.fraudFlags || selectedRecon.fraudFlags.length === 0" class="text-green-4">None Detected</span>
                </div>
              </div>
            </q-tab-panel>

            <!-- PLACEHOLDERS FOR OTHERS -->
            <q-tab-panel name="ledger" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-lg border-muted rounded-borders flex flex-center column font-mono">
                <q-icon name="receipt_long" color="grey-6" size="xl" class="q-mb-md" />
                <div class="text-h6 text-muted">No Data Available</div>
                <div class="text-caption text-grey-6 text-center">Ledger entries for this reconciliation case are either missing or have not been ingested.</div>
              </div>
            </q-tab-panel>
            
            <q-tab-panel name="settlement" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-lg border-muted rounded-borders flex flex-center column font-mono">
                <q-icon name="account_balance" color="amber-6" size="xl" class="q-mb-md" />
                <div class="text-h6 text-muted">Not Yet Configured</div>
                <div class="text-caption text-grey-6 text-center">Settlement engine integration is pending implementation for this flow.</div>
              </div>
            </q-tab-panel>
            
            <q-tab-panel name="wallet" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-lg border-muted rounded-borders flex flex-center column font-mono">
                <q-icon name="account_balance_wallet" color="cyan-6" size="xl" class="q-mb-md" />
                <div class="text-h6 text-muted">Not Yet Configured</div>
                <div class="text-caption text-grey-6 text-center">Wallet telemetry subtab not yet configured.</div>
              </div>
            </q-tab-panel>
            
            <q-tab-panel name="card" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-lg border-muted rounded-borders flex flex-center column font-mono">
                <q-icon name="credit_card" color="indigo-6" size="xl" class="q-mb-md" />
                <div class="text-h6 text-muted">Not Yet Configured</div>
                <div class="text-caption text-grey-6 text-center">Card Network integration not yet configured.</div>
              </div>
            </q-tab-panel>
            
            <q-tab-panel name="bank" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-lg border-muted rounded-borders flex flex-center column font-mono">
                <q-icon name="food_bank" color="green-6" size="xl" class="q-mb-md" />
                <div class="text-h6 text-muted">Not Yet Configured</div>
                <div class="text-caption text-grey-6 text-center">Direct bank node integration not yet configured.</div>
              </div>
            </q-tab-panel>
            
            <q-tab-panel name="audit" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-lg border-muted rounded-borders flex flex-center column font-mono">
                <q-icon name="policy" color="grey-6" size="xl" class="q-mb-md" />
                <div class="text-h6 text-muted">No Audit Data</div>
                <div class="text-caption text-grey-6 text-center">No governance actions or system audits found for this specific case yet.</div>
              </div>
            </q-tab-panel>
            
            <q-tab-panel name="timeline" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-lg border-muted rounded-borders flex flex-center column font-mono">
                <q-icon name="timeline" color="grey-6" size="xl" class="q-mb-md" />
                <div class="text-h6 text-muted">Timeline Unavailable</div>
                <div class="text-caption text-grey-6 text-center">The chronological timeline events for this flow are not yet generated.</div>
              </div>
            </q-tab-panel>
            
            <q-tab-panel name="resolution" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-lg border-muted rounded-borders flex flex-center column font-mono">
                <q-icon name="history" color="grey-6" size="xl" class="q-mb-md" />
                <div class="text-h6 text-muted">No Resolution History</div>
                <div class="text-caption text-grey-6 text-center">No historical resolutions or overrides have been applied to this case.</div>
              </div>
            </q-tab-panel>

          </q-tab-panels>
        </q-scroll-area>
      </div>
    </q-drawer>

  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useCurrency } from '../../composables/useCurrency';
import { reconciliationApi } from '../../api';
import { useQuasar } from 'quasar';

const { currentCurrency } = useCurrency();
const $q = useQuasar();

const activeWorkspaceTab = ref('queues')
const activeQueueTab = ref('mismatch')
const searchQuery = ref('')
const selectedRecords = ref([])

const drawerOpen = ref(false)
const drawerTab = ref('overview')
const selectedRecon = ref(null)

const inspectRecon = (row) => {
  selectedRecon.value = row
  drawerOpen.value = true
  drawerTab.value = 'overview'
}

const getStatusColor = (status) => {
  const map = {
    'MATCHED': 'green-4',
    'PENDING': 'amber-4',
    'MISMATCH': 'red-4',
    'FAILED': 'purple-4',
    'INVESTIGATING': 'indigo-4'
  }
  return map[status] || 'grey-4'
}

// INVESTIGATION GRID DATA
const reconCols = [
  { name: 'id', label: 'RECON ID', field: 'id', align: 'left' },
  { name: 'txnId', label: 'TXN ID', field: 'txnId', align: 'left' },
  { name: 'ledgerBatchId', label: 'LEDGER BATCH', field: 'ledgerBatchId', align: 'left' },
  { name: 'amount', label: 'EXPECTED (₦)', field: 'expectedAmount', align: 'right' },
  { name: 'actual', label: 'ACTUAL (₦)', field: 'actualAmount', align: 'right' },
  { name: 'difference', label: 'DIFF', field: 'difference', align: 'right' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' },
  { name: 'createdDate', label: 'CREATED', field: 'createdDate', align: 'right' }
]

const reconRecords = ref([])
const exceptions = ref([])

const summaryStats = ref({
  totalPayments: 0,
  matched: 0,
  unmatched: 0,
  issues: 0,
  mismatchAmount: 0,
  reconciliationRate: 0
});

const loadData = async () => {
  try {
    const res = await reconciliationApi.getReport({ status: 'all' });
    reconRecords.value = res.data.data || [];
    summaryStats.value = res.data.summary || summaryStats.value;
    
    exceptions.value = reconRecords.value.filter(r => ['MISMATCH', 'FAILED', 'ESCALATED'].includes(r.status)).map(r => ({
      id: `EXC-${r.id.split('-').pop()}`,
      type: r.status === 'FAILED' ? 'Bank Failure' : 'Amount Mismatch',
      description: `Discrepancy detected for transaction ${r.txnId}. Difference: ${r.difference}`,
      reconRecord: r
    }));
  } catch (error) {
    console.error('Failed to load reconciliation data', error);
    $q.notify({ color: 'negative', message: 'Failed to load reconciliation data' });
  }
};

const executeCommand = async (commandName) => {
  if (!selectedRecon.value) return;
  try {
    $q.loading.show();
    const res = await reconciliationApi[commandName](selectedRecon.value.id, { reason: 'Admin Action', ip: '127.0.0.1' });
    $q.notify({ color: 'positive', message: `Command ${commandName} executed successfully` });
    
    // Optimistic Update
    if (res.data.newStatus) {
      selectedRecon.value.status = res.data.newStatus;
      const idx = reconRecords.value.findIndex(r => r.id === selectedRecon.value.id);
      if (idx !== -1) reconRecords.value[idx].status = res.data.newStatus;
    }
  } catch (error) {
    $q.notify({ color: 'negative', message: error.response?.data?.error || `Command ${commandName} failed` });
  } finally {
    $q.loading.hide();
  }
};

onMounted(() => {
  loadData();
});

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
.hover-underline:hover {
  text-decoration: underline;
}

.border-cyan-left { border-left: 2px solid #22b8cf !important; }
.border-indigo-left { border-left: 2px solid #7048e8 !important; }
.border-amber-left { border-left: 2px solid #fcc419 !important; }
.border-green-left { border-left: 2px solid #51cf66 !important; }
.border-red-left { border-left: 2px solid #c92a2a !important; }
.border-purple-left { border-left: 2px solid #be4bdb !important; }
</style>
