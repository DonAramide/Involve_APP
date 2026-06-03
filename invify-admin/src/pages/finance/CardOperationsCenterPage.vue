<!-- invify-admin/src/pages/finance/CardOperationsCenterPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Card Health -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Card Command Center</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Card Operations Center
          </div>
        </div>

        <!-- Card Health Score Panel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 20px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Health Score:</span>
            <span class="text-green-4 text-weight-bold text-subtitle2">99.1%</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Status:</span>
            <q-badge color="green-10" text-color="green-3">Healthy</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Blocked Cards:</span>
            <span class="text-red-4 text-weight-bold">42</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Active Disputes:</span>
            <span class="text-amber-4 text-weight-bold">14</span>
          </div>
          <q-icon name="credit_card" color="green-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh Data" class="text-caption text-weight-bold" />
        <q-btn-dropdown size="xs" color="indigo-4" icon="shield" label="Risk & Disputes" class="text-caption text-weight-bold text-white" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Chargeback Volume Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>High Risk Cards Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Expired Cards Audit</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn-dropdown outline size="xs" color="grey-6" icon="download" label="Export Cards" class="text-caption text-weight-bold" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>CSV</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Excel</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>PDF</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- Card KPI Dashboard -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Total / Active Cards</div>
          <div class="text-h5 text-metric-mono text-cyan-4">3.4M / 2.8M</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Total Card Spend (30d)</div>
          <div class="text-h5 text-metric-mono text-green-4">{{ currentCurrency.symbol }}142.5B <q-icon name="trending_up" size="xs"/></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Avg Spend / Card Success</div>
          <div class="text-h5 text-metric-mono text-amber-5">{{ currentCurrency.symbol }}41,900 / 99.4%</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Blocked / Frozen / Expired</div>
          <div class="text-h5 text-metric-mono text-red-5">42 / 12 / 8K</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Chargeback / Dispute Vol</div>
          <div class="text-h5 text-metric-mono text-indigo-4">{{ currentCurrency.symbol }}2.4M / 14</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-purple-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Cards At Risk</div>
          <div class="text-h5 text-metric-mono text-purple-4">24</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Queue Tabs & Command Bar Search -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-sm">
        <q-tabs v-model="activeWorkspaceTab" dense class="text-grey-5" active-color="amber-4" indicator-color="amber-4" align="left">
          <q-tab name="directory" label="Card Directory" icon="credit_card" />
          <q-tab name="chargebacks" label="Chargeback Center" icon="gavel" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="filter_list" color="grey-5" size="sm"><q-tooltip>Advanced Filters</q-tooltip></q-btn>
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search PAN, OWNER, TENANT..." class="text-caption" style="width: 280px;">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeWorkspaceTab" animated class="bg-transparent col" keep-alive>
        
        <!-- CARD DIRECTORY GRID PANEL -->
        <q-tab-panel name="directory" class="q-pa-none column no-wrap">
          <div class="bg-subpanel border-bottom scroll-x">
            <q-tabs v-model="activeCategoryTab" dense class="text-grey-5 font-mono text-caption" active-color="cyan-4" align="left" no-caps>
              <q-tab name="active" label="Active" />
              <q-tab name="blocked" label="Blocked" />
              <q-tab name="frozen" label="Frozen" />
              <q-tab name="expired" label="Expired" />
              <q-tab name="atrisk" label="At Risk" />
              <q-separator vertical class="q-mx-sm bg-dark" />
              <q-tab name="virtual" label="Virtual" />
              <q-tab name="physical" label="Physical" />
              <q-tab name="prepaid" label="Prepaid" />
              <q-tab name="student" label="Student" />
              <q-tab name="parent" label="Parent" />
              <q-tab name="merchant" label="Merchant" />
              <q-tab name="corporate" label="Corporate" />
              <q-tab name="treasury" label="Treasury" />
            </q-tabs>
          </div>
          
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="cardRecords"
            :columns="cardCols"
            row-key="id"
            dense
            virtual-scroll
            style="height: 100%;"
            selection="multiple"
            v-model:selected="selectedRecords"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-amber-3 cursor-pointer text-weight-bold hover-underline" @click="inspectCard(props.row)">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-maskedPan="props">
              <q-td :props="props" class="font-mono text-cyan-3">
                <q-icon name="credit_card" size="xs" class="q-mr-xs opacity-50" />
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
            <template v-slot:body-cell-currentBalance="props">
              <q-td :props="props" class="font-mono text-right text-weight-bold">
                {{ currentCurrency.symbol }}{{ props.value.toLocaleString() }}
              </q-td>
            </template>
            <template v-slot:body-cell-spendLimit="props">
              <q-td :props="props" class="font-mono text-right text-muted">
                {{ currentCurrency.symbol }}{{ props.value.toLocaleString() }}
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

        <!-- CHARGEBACK CENTER -->
        <q-tab-panel name="chargebacks" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Chargeback & Dispute Management</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-3">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders bg-dark column op-gap-8">
                <div class="text-caption text-muted font-mono">Dispute DISP-2026-001</div>
                <div class="row justify-between"><span class="text-muted">Card:</span><span class="text-cyan-4">**** 4111</span></div>
                <div class="row justify-between"><span class="text-muted">Amount:</span><span class="text-red-4">{{ currentCurrency.symbol }}14,500</span></div>
                <div class="row justify-between"><span class="text-muted">Reason:</span><span class="text-main">Fraudulent Use</span></div>
                <div class="q-mt-sm"><q-badge color="amber-10" text-color="amber-3">INVESTIGATING</q-badge></div>
                <q-btn outline size="xs" color="cyan-4" label="Review Evidence" class="q-mt-sm" />
              </div>
            </div>
            <div class="col-12 col-md-3">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders bg-dark column op-gap-8">
                <div class="text-caption text-muted font-mono">Dispute DISP-2026-002</div>
                <div class="row justify-between"><span class="text-muted">Card:</span><span class="text-cyan-4">**** 8824</span></div>
                <div class="row justify-between"><span class="text-muted">Amount:</span><span class="text-red-4">{{ currentCurrency.symbol }}5,000</span></div>
                <div class="row justify-between"><span class="text-muted">Reason:</span><span class="text-main">Duplicate Charge</span></div>
                <div class="q-mt-sm"><q-badge color="green-10" text-color="green-3">RESOLVED</q-badge></div>
                <q-btn outline size="xs" color="grey-6" label="View Resolution" class="q-mt-sm" />
              </div>
            </div>
          </div>
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- CARD INSPECTION DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="950">
      <div v-if="selectedCard" class="column full-height">
        
        <!-- Drawer Header & Action Center -->
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="purple-10" text-color="purple-3" label="CARD COMMAND" />
                <div class="text-h5 font-mono text-main">{{ selectedCard.maskedPan }}</div>
                <q-badge :color="getStatusColor(selectedCard.status)" text-color="dark">{{ selectedCard.status }}</q-badge>
              </div>
              <div class="text-caption text-muted font-mono">Card ID: {{ selectedCard.id }} | Owner: {{ selectedCard.owner }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- Operational Action Center -->
          <div class="row items-center op-gap-8 bg-dark q-pa-sm rounded-borders border-muted">
            <div class="text-caption font-mono text-muted q-mr-sm">ACTIONS:</div>
            <q-btn outline size="xs" color="cyan-4" icon="lock_open" label="Unfreeze Card" v-if="selectedCard.status === 'FROZEN'" />
            <q-btn outline size="xs" color="amber-4" icon="ac_unit" label="Freeze Card" v-if="selectedCard.status === 'ACTIVE'" />
            <q-btn outline size="xs" color="red-4" icon="block" label="Block & Replace" />
            <q-btn outline size="xs" color="orange-4" icon="pin" label="Reset PIN" />
            <q-btn outline size="xs" color="indigo-4" icon="tune" label="Adjust Limits" />
            <q-space />
            <q-btn outline size="xs" color="grey-6" icon="account_balance_wallet" label="Open Wallet" />
            <q-btn outline size="xs" color="grey-6" icon="gavel" label="Escalate" />
          </div>
        </div>

        <!-- Drawer Tabs -->
        <q-tabs v-model="drawerTab" dense class="text-grey-5 font-mono text-caption border-bottom scroll-x" active-color="amber-4" align="left" no-caps>
          <q-tab name="overview" label="Overview" />
          <q-tab name="profile" label="Card Profile" />
          <q-tab name="transactions" label="Transactions" />
          <q-tab name="funding" label="Funding Activity" />
          <q-tab name="wallet" label="Wallet Sync" />
          <q-tab name="ledger" label="Ledger Impact" />
          <q-tab name="settlement" label="Settlement" />
          <q-tab name="risk" label="Risk Analysis" />
          <q-tab name="compliance" label="Compliance" />
          <q-tab name="device" label="Device/Terminal Sync" />
          <q-tab name="audit" label="Audit Trail" />
          <q-tab name="timeline" label="Timeline" />
          <q-tab name="related" label="Related Records" />
          <q-tab name="resolution" label="Resolution" />
        </q-tabs>

        <q-scroll-area class="col">
          <q-tab-panels v-model="drawerTab" animated class="bg-transparent" keep-alive>
            
            <!-- OVERVIEW -->
            <q-tab-panel name="overview" class="q-pa-md column op-gap-16">
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Card Identity</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Card Type:</span><span class="text-cyan-4">{{ selectedCard.cardType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Owner:</span><span class="text-main">{{ selectedCard.owner }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant:</span><span class="text-main">{{ selectedCard.tenant }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Wallet ID:</span><span class="text-indigo-4">{{ selectedCard.walletId }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Issue Date:</span><span class="text-main">{{ selectedCard.createdDate }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Expiry Date:</span><span class="text-amber-4">{{ selectedCard.expiryDate }}</span></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height bg-dark">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Limits & Balances</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Linked Wallet Balance:</span><span class="text-main">{{ currentCurrency.symbol }}{{ selectedCard.currentBalance.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Daily Spend Limit:</span><span class="text-amber-4">{{ currentCurrency.symbol }}{{ selectedCard.spendLimit.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mt-sm border-top q-pt-sm font-mono text-weight-bold"><span class="text-muted">Available Limit:</span><span class="text-green-4 text-h6" style="line-height: 1;">{{ currentCurrency.symbol }}{{ Math.min(selectedCard.currentBalance, selectedCard.spendLimit).toLocaleString() }}</span></div>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- CARD PROFILE -->
            <q-tab-panel name="profile" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md">Issuing & Control Profile</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Card Scheme:</span><span class="text-main">Mastercard</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Card Product:</span><span class="text-cyan-4">Standard Virtual Prepaid</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">BIN / Issuer:</span><span class="text-main">5399XX / Providus Bank</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Program:</span><span class="text-main">Invify Student Pay</span></div>
                <div class="q-my-md border-top"></div>
                <div class="text-muted text-caption q-mb-sm">Card Controls & Restrictions</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Velocity Limits:</span><span class="text-amber-4">10 Txns / Day</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Channel Restrictions:</span><span class="text-main">POS (Disabled), WEB (Enabled), ATM (Disabled)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Country Restrictions:</span><span class="text-green-4">Nigeria Only</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Merchant Restrictions:</span><span class="text-red-4">Gambling (Blocked), Crypto (Blocked)</span></div>
              </div>
            </q-tab-panel>

            <!-- RISK ANALYSIS -->
            <q-tab-panel name="risk" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row items-center op-gap-8 q-mb-md">
                  <q-circular-progress show-value class="text-caption text-white" :value="selectedCard.riskScore" size="50px" :color="selectedCard.riskScore > 80 ? 'red-5' : 'green-5'" track-color="dark" thickness="0.3">{{ selectedCard.riskScore }}</q-circular-progress>
                  <div>
                    <div class="text-weight-bold">Card Risk Assessment</div>
                    <div class="text-caption text-muted">AI Anomaly Score: {{ selectedCard.anomalyScore }}</div>
                    <div class="text-caption text-indigo-3">Account Takeover Risk: LOW</div>
                  </div>
                </div>
                <div class="text-caption text-muted border-bottom q-pb-xs q-mb-sm">Fraud Flags & Breaches</div>
                <div class="row op-gap-8">
                  <q-badge color="red-10" text-color="red-3" v-for="flag in selectedCard.fraudFlags" :key="flag">{{ flag }}</q-badge>
                  <span v-if="!selectedCard.fraudFlags || selectedCard.fraudFlags.length === 0" class="text-green-4">None Detected</span>
                </div>
              </div>
            </q-tab-panel>

            <!-- DEVICE RELATIONSHIPS -->
            <q-tab-panel name="device" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md">Device & Terminal Sync (Quasar Integration)</div>
                <div class="text-caption text-muted q-mb-md">Critical for Student & Agent Cards using physical hardware.</div>
                <q-list separator dark class="bg-transparent border-muted rounded-borders">
                  <q-item>
                    <q-item-section avatar><q-icon name="smartphone" color="cyan-4" /></q-item-section>
                    <q-item-section>
                      <q-item-label class="text-cyan-3">DEV-IOS-211</q-item-label>
                      <q-item-label caption>iPhone 13 | Invify App Installed (Tokenized)</q-item-label>
                    </q-item-section>
                    <q-item-section side><q-badge color="green-10" text-color="green-3">Synced 1hr ago</q-badge></q-item-section>
                  </q-item>
                  <q-item v-if="selectedCard.cardType === 'MERCHANT' || selectedCard.cardType === 'AGENT'">
                    <q-item-section avatar><q-icon name="point_of_sale" color="amber-4" /></q-item-section>
                    <q-item-section>
                      <q-item-label class="text-amber-3">TRM-POS-004</q-item-label>
                      <q-item-label caption>MPOS Terminal | Issued to Agent</q-item-label>
                    </q-item-section>
                    <q-item-section side><q-badge color="green-10" text-color="green-3">Online</q-badge></q-item-section>
                  </q-item>
                </q-list>
              </div>
            </q-tab-panel>

            <!-- PLACEHOLDERS FOR OTHERS -->
            <q-tab-panel name="transactions" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Transaction History View</div></q-tab-panel>
            <q-tab-panel name="funding" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Funding & Top-up Activity View</div></q-tab-panel>
            <q-tab-panel name="wallet" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Wallet Sync & Relationship View</div></q-tab-panel>
            <q-tab-panel name="ledger" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Ledger Impact View</div></q-tab-panel>
            <q-tab-panel name="settlement" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Settlement Activity View</div></q-tab-panel>
            <q-tab-panel name="compliance" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Compliance & Regulatory View</div></q-tab-panel>
            <q-tab-panel name="audit" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Audit Trail View</div></q-tab-panel>
            <q-tab-panel name="timeline" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Chronological Timeline View</div></q-tab-panel>
            <q-tab-panel name="related" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Related Records View</div></q-tab-panel>
            <q-tab-panel name="resolution" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Resolution History View</div></q-tab-panel>

          </q-tab-panels>
        </q-scroll-area>
      </div>
    </q-drawer>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref } from 'vue'

const activeWorkspaceTab = ref('directory')
const activeCategoryTab = ref('active')
const searchQuery = ref('')
const selectedRecords = ref([])

const drawerOpen = ref(false)
const drawerTab = ref('overview')
const selectedCard = ref(null)

const inspectCard = (row) => {
  selectedCard.value = row
  drawerOpen.value = true
  drawerTab.value = 'overview'
}

const getStatusColor = (status) => {
  const map = {
    'ACTIVE': 'green-4',
    'FROZEN': 'amber-4',
    'BLOCKED': 'red-4',
    'EXPIRED': 'grey-5'
  }
  return map[status] || 'grey-4'
}

// INVESTIGATION GRID DATA
const cardCols = [
  { name: 'id', label: 'CARD ID', field: 'id', align: 'left' },
  { name: 'maskedPan', label: 'PAN', field: 'maskedPan', align: 'left' },
  { name: 'cardType', label: 'TYPE', field: 'cardType', align: 'left' },
  { name: 'owner', label: 'OWNER', field: 'owner', align: 'left' },
  { name: 'tenant', label: 'TENANT', field: 'tenant', align: 'left' },
  { name: 'walletId', label: 'WALLET LINK', field: 'walletId', align: 'left' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'currentBalance', label: 'BALANCE (₦)', field: 'currentBalance', align: 'right' },
  { name: 'spendLimit', label: 'DAILY LIMIT (₦)', field: 'spendLimit', align: 'right' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' },
  { name: 'lastTransaction', label: 'LAST TXN', field: 'lastTransaction', align: 'right' }
]

const cardRecords = ref([
  {
    id: 'CRD-STU-0012',
    maskedPan: '5399 **** **** 4111',
    cardType: 'STUDENT VIRTUAL',
    owner: 'Michael Ojo',
    tenant: 'Ahmadu Bello University',
    tenantType: 'SCHOOL',
    walletId: 'WAL-SCH-1122',
    currentBalance: 45000,
    spendLimit: 20000,
    status: 'ACTIVE',
    riskScore: 8,
    anomalyScore: 0.02,
    fraudFlags: [],
    createdDate: '2026-01-15',
    expiryDate: '2029-01-31',
    lastTransaction: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'CRD-AGT-0094',
    maskedPan: '5399 **** **** 8824',
    cardType: 'AGENT PHYSICAL',
    owner: 'Sarah Agent',
    tenant: 'Invify Agency Network',
    tenantType: 'PLATFORM',
    walletId: 'WAL-AGT-8812',
    currentBalance: 150000,
    spendLimit: 500000,
    status: 'FROZEN',
    riskScore: 78,
    anomalyScore: 0.81,
    fraudFlags: ['UNUSUAL_GEO', 'CARD_TESTING_SUSPECTED'],
    createdDate: '2025-11-05',
    expiryDate: '2028-11-30',
    lastTransaction: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: 'CRD-COR-0001',
    maskedPan: '5399 **** **** 9912',
    cardType: 'TREASURY CORPORATE',
    owner: 'Treasury Admin',
    tenant: 'Invify Core',
    tenantType: 'PLATFORM',
    walletId: 'WAL-TRS-0001',
    currentBalance: 45000000,
    spendLimit: 10000000,
    status: 'ACTIVE',
    riskScore: 2,
    anomalyScore: 0.01,
    fraudFlags: [],
    createdDate: '2026-01-01',
    expiryDate: '2030-12-31',
    lastTransaction: new Date(Date.now() - 7200000).toISOString()
  }
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
.hover-underline:hover {
  text-decoration: underline;
}
.scroll-x {
  overflow-x: auto;
}

.border-cyan-left { border-left: 2px solid #22b8cf !important; }
.border-indigo-left { border-left: 2px solid #7048e8 !important; }
.border-amber-left { border-left: 2px solid #fcc419 !important; }
.border-green-left { border-left: 2px solid #51cf66 !important; }
.border-red-left { border-left: 2px solid #c92a2a !important; }
.border-purple-left { border-left: 2px solid #be4bdb !important; }
</style>
