<!-- invify-admin/src/pages/finance/WalletOperationsCenterPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Wallet Health -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Wallet Command Center</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Wallet Operations Center
          </div>
        </div>

        <!-- Wallet Health Score Panel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 20px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Health Score:</span>
            <span class="text-green-4 text-weight-bold text-subtitle2">99.2%</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Status:</span>
            <q-badge color="green-10" text-color="green-3">Healthy</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Negative Balance:</span>
            <span class="text-amber-4 text-weight-bold">3</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">High Risk:</span>
            <span class="text-red-4 text-weight-bold">12</span>
          </div>
          <q-icon name="account_balance_wallet" color="green-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh Data" class="text-caption text-weight-bold" />
        <q-btn-dropdown size="xs" color="indigo-4" icon="account_balance" label="Treasury Statements" class="text-caption text-weight-bold text-white" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Global Wallet Float</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Negative Balance Exposure</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Dormant Account Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>High Risk Wallet Report</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn-dropdown outline size="xs" color="grey-6" icon="download" label="Export Wallets" class="text-caption text-weight-bold" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>CSV</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Excel</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>PDF</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- Wallet KPI Dashboard -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Total Wallets</div>
          <div class="text-h5 text-metric-mono text-cyan-4">1.2M <q-icon name="trending_up" size="xs"/></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Active Wallets</div>
          <div class="text-h5 text-metric-mono text-green-4">845K</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Dormant Wallets</div>
          <div class="text-h5 text-metric-mono text-amber-5">352K</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Suspended / Negative</div>
          <div class="text-h5 text-metric-mono text-red-5">1,204 / 3</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Total Wallet Float</div>
          <div class="text-h5 text-metric-mono text-indigo-4">₦18.4B</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-purple-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Wallet Growth Rate</div>
          <div class="text-h5 text-metric-mono text-purple-4">+12.4% /mo</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Queue Tabs & Command Bar Search -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-sm">
        <q-tabs v-model="activeWorkspaceTab" dense class="text-grey-5" active-color="amber-4" indicator-color="amber-4" align="left">
          <q-tab name="all" label="Wallet Directory" icon="view_list" />
          <q-tab name="investigations" label="Risk Investigations" icon="policy" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="filter_list" color="grey-5" size="sm"><q-tooltip>Advanced Filters</q-tooltip></q-btn>
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search WALLET, OWNER, TENANT..." class="text-caption" style="width: 280px;">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeWorkspaceTab" animated class="bg-transparent col" keep-alive>
        
        <!-- WALLET DIRECTORY GRID PANEL -->
        <q-tab-panel name="all" class="q-pa-none column no-wrap">
          <div class="bg-subpanel border-bottom scroll-x">
            <q-tabs v-model="activeCategoryTab" dense class="text-grey-5 font-mono text-caption" active-color="cyan-4" align="left" no-caps>
              <q-tab name="active" label="Active" />
              <q-tab name="dormant" label="Dormant" />
              <q-tab name="suspended" label="Suspended" />
              <q-tab name="negative" label="Negative Balance" />
              <q-tab name="highrisk" label="High Risk" />
              <q-tab name="treasury" label="Treasury" />
              <q-tab name="settlement" label="Settlement" />
              <q-tab name="merchant" label="Merchant" />
              <q-tab name="school" label="School" />
              <q-tab name="agent" label="Agent" />
            </q-tabs>
          </div>
          
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="walletRecords"
            :columns="walletCols"
            row-key="id"
            dense
            virtual-scroll
            style="height: 100%;"
            selection="multiple"
            v-model:selected="selectedRecords"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-amber-3 cursor-pointer text-weight-bold hover-underline" @click="inspectWallet(props.row)">
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
              <q-td :props="props" class="font-mono text-right text-weight-bold" :class="props.value < 0 ? 'text-red-4' : 'text-main'">
                ₦{{ props.value.toLocaleString() }}
              </q-td>
            </template>
            <template v-slot:body-cell-availableBalance="props">
              <q-td :props="props" class="font-mono text-right text-green-4 text-weight-bold">
                ₦{{ props.value.toLocaleString() }}
              </q-td>
            </template>
            <template v-slot:body-cell-pendingBalance="props">
              <q-td :props="props" class="font-mono text-right text-amber-4 text-weight-bold">
                ₦{{ props.value.toLocaleString() }}
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

        <!-- INVESTIGATIONS -->
        <q-tab-panel name="investigations" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Active Risk Investigations</div>
          <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted">
            <q-icon name="plagiarism" size="xl" class="q-mb-md opacity-50" />
            <div>No Active Long-Term Investigations</div>
          </div>
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- WALLET INSPECTION DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="900">
      <div v-if="selectedWallet" class="column full-height">
        
        <!-- Drawer Header & Action Center -->
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="cyan-10" text-color="cyan-3" label="WALLET COMMAND" />
                <div class="text-h5 font-mono text-main">{{ selectedWallet.id }}</div>
                <q-badge :color="getStatusColor(selectedWallet.status)" text-color="dark">{{ selectedWallet.status }}</q-badge>
              </div>
              <div class="text-caption text-muted font-mono">Owner: {{ selectedWallet.owner }} | Created: {{ selectedWallet.createdDate }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- Operational Action Center -->
          <div class="row items-center op-gap-8 bg-dark q-pa-sm rounded-borders border-muted">
            <div class="text-caption font-mono text-muted q-mr-sm">ACTIONS:</div>
            <q-btn outline size="xs" color="cyan-4" icon="receipt_long" label="Generate Statement" />
            <q-btn outline size="xs" color="amber-4" icon="pan_tool" label="Suspend Wallet" v-if="selectedWallet.status === 'ACTIVE'" />
            <q-btn outline size="xs" color="green-4" icon="lock_open" label="Unfreeze/Reactivate" v-if="selectedWallet.status !== 'ACTIVE'" />
            <q-btn outline size="xs" color="red-4" icon="gavel" label="Escalate Investigation" />
            <q-space />
            <q-btn outline size="xs" color="grey-6" icon="open_in_new" label="Open Ledger" />
            <q-btn outline size="xs" color="grey-6" icon="open_in_new" label="Open Txns" />
          </div>
        </div>

        <!-- Drawer Tabs -->
        <q-tabs v-model="drawerTab" dense class="text-grey-5 font-mono text-caption border-bottom scroll-x" active-color="amber-4" align="left" no-caps>
          <q-tab name="overview" label="Overview" />
          <q-tab name="balance" label="Balance Analysis" />
          <q-tab name="transactions" label="Transaction History" />
          <q-tab name="ledger" label="Ledger Impact" />
          <q-tab name="settlement" label="Settlement Activity" />
          <q-tab name="risk" label="Risk Analysis" />
          <q-tab name="compliance" label="Compliance" />
          <q-tab name="audit" label="Audit Trail" />
          <q-tab name="timeline" label="Timeline" />
          <q-tab name="related" label="Related Records" />
          <q-tab name="device" label="Device Relationships" />
          <q-tab name="documents" label="Documents" />
          <q-tab name="resolution" label="Resolution" />
        </q-tabs>

        <q-scroll-area class="col">
          <q-tab-panels v-model="drawerTab" animated class="bg-transparent" keep-alive>
            
            <!-- OVERVIEW -->
            <q-tab-panel name="overview" class="q-pa-md column op-gap-16">
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Wallet Profile</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Wallet Type:</span><span class="text-cyan-4">{{ selectedWallet.walletType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Owner:</span><span class="text-main">{{ selectedWallet.owner }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant:</span><span class="text-main">{{ selectedWallet.tenant }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant Type:</span><span class="text-main">{{ selectedWallet.tenantType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Created:</span><span class="text-main">{{ selectedWallet.createdDate }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Last Activity:</span><span class="text-main">{{ selectedWallet.lastActivity }}</span></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height bg-dark">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Live Balances</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Current Balance:</span><span :class="selectedWallet.currentBalance < 0 ? 'text-red-4' : 'text-main'">₦{{ selectedWallet.currentBalance.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Pending Credits:</span><span class="text-amber-4">₦{{ selectedWallet.pendingBalance.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Held/Reserved:</span><span class="text-red-4">₦0</span></div>
                    <div class="row justify-between q-mt-sm border-top q-pt-sm font-mono text-weight-bold"><span class="text-muted">Available Balance:</span><span class="text-green-4 text-h6" style="line-height: 1;">₦{{ selectedWallet.availableBalance.toLocaleString() }}</span></div>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- BALANCE ANALYSIS -->
            <q-tab-panel name="balance" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md">Balance Reconciliation (Last 30 Days)</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Opening Balance:</span><span class="text-main">₦4,200,000</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Total Credits (In):</span><span class="text-green-4">+ ₦12,500,000</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Total Debits (Out):</span><span class="text-red-4">- ₦8,450,000</span></div>
                <div class="row justify-between q-mt-sm border-top q-pt-sm font-mono text-weight-bold"><span class="text-muted">Calculated Closing:</span><span class="text-main">₦8,250,000</span></div>
              </div>
            </q-tab-panel>

            <!-- RISK ANALYSIS -->
            <q-tab-panel name="risk" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row items-center op-gap-8 q-mb-md">
                  <q-circular-progress show-value class="text-caption text-white" :value="selectedWallet.riskScore" size="50px" :color="selectedWallet.riskScore > 80 ? 'red-5' : 'green-5'" track-color="dark" thickness="0.3">{{ selectedWallet.riskScore }}</q-circular-progress>
                  <div>
                    <div class="text-weight-bold">Wallet Risk Assessment</div>
                    <div class="text-caption text-muted">AI Anomaly Score: {{ selectedWallet.anomalyScore }}</div>
                    <div class="text-caption text-indigo-3">Account Takeover Risk: LOW</div>
                  </div>
                </div>
                <div class="text-caption text-muted border-bottom q-pb-xs q-mb-sm">Fraud Flags Detected</div>
                <div class="row op-gap-8">
                  <q-badge color="red-10" text-color="red-3" v-for="flag in selectedWallet.fraudFlags" :key="flag">{{ flag }}</q-badge>
                  <span v-if="!selectedWallet.fraudFlags || selectedWallet.fraudFlags.length === 0" class="text-green-4">None Detected</span>
                </div>
              </div>
            </q-tab-panel>

            <!-- DEVICE RELATIONSHIPS -->
            <q-tab-panel name="device" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md">Linked Terminal & Device Ecosystem</div>
                <q-list separator dark class="bg-transparent">
                  <q-item>
                    <q-item-section avatar><q-icon name="point_of_sale" color="cyan-4" /></q-item-section>
                    <q-item-section>
                      <q-item-label class="text-cyan-3">TRM-884-211</q-item-label>
                      <q-item-label caption>MPOS Terminal | Last Sync: 2 mins ago</q-item-label>
                    </q-item-section>
                    <q-item-section side><q-badge color="green-10" text-color="green-3">Online</q-badge></q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section avatar><q-icon name="smartphone" color="amber-4" /></q-item-section>
                    <q-item-section>
                      <q-item-label class="text-amber-3">DEV-AND-991</q-item-label>
                      <q-item-label caption>Samsung Galaxy A12 | Owner: Jane Doe</q-item-label>
                    </q-item-section>
                    <q-item-section side><q-badge color="grey-9" text-color="grey-4">Offline</q-badge></q-item-section>
                  </q-item>
                </q-list>
              </div>
            </q-tab-panel>

            <!-- COMPLIANCE -->
            <q-tab-panel name="compliance" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md">Regulatory & Compliance Profile</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">KYC Status:</span><span class="text-green-4">TIER 3 (VERIFIED)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">AML Status:</span><span class="text-green-4">CLEARED</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Sanctions Status:</span><span class="text-green-4">CLEARED</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Regulatory Flags:</span><span class="text-main">None</span></div>
              </div>
            </q-tab-panel>

            <!-- PLACEHOLDERS FOR OTHERS -->
            <q-tab-panel name="transactions" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Transaction History View</div></q-tab-panel>
            <q-tab-panel name="ledger" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Ledger Impact View</div></q-tab-panel>
            <q-tab-panel name="settlement" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Settlement Activity View</div></q-tab-panel>
            <q-tab-panel name="audit" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Audit Trail View</div></q-tab-panel>
            <q-tab-panel name="timeline" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Chronological Timeline View</div></q-tab-panel>
            <q-tab-panel name="related" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Related Records View</div></q-tab-panel>
            <q-tab-panel name="documents" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Attached Documents View</div></q-tab-panel>
            <q-tab-panel name="resolution" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Resolution History View</div></q-tab-panel>

          </q-tab-panels>
        </q-scroll-area>
      </div>
    </q-drawer>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'

const activeWorkspaceTab = ref('all')
const activeCategoryTab = ref('active')
const searchQuery = ref('')
const selectedRecords = ref([])

const drawerOpen = ref(false)
const drawerTab = ref('overview')
const selectedWallet = ref(null)

const inspectWallet = (row) => {
  selectedWallet.value = row
  drawerOpen.value = true
  drawerTab.value = 'overview'
}

const getStatusColor = (status) => {
  const map = {
    'ACTIVE': 'green-4',
    'DORMANT': 'grey-5',
    'SUSPENDED': 'amber-4',
    'BLOCKED': 'red-4'
  }
  return map[status] || 'grey-4'
}

// INVESTIGATION GRID DATA
const walletCols = [
  { name: 'id', label: 'WALLET ID', field: 'id', align: 'left' },
  { name: 'walletType', label: 'TYPE', field: 'walletType', align: 'left' },
  { name: 'owner', label: 'OWNER', field: 'owner', align: 'left' },
  { name: 'tenant', label: 'TENANT', field: 'tenant', align: 'left' },
  { name: 'currentBalance', label: 'CURRENT (₦)', field: 'currentBalance', align: 'right' },
  { name: 'availableBalance', label: 'AVAILABLE (₦)', field: 'availableBalance', align: 'right' },
  { name: 'pendingBalance', label: 'PENDING (₦)', field: 'pendingBalance', align: 'right' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' },
  { name: 'lastActivity', label: 'LAST ACTIVE', field: 'lastActivity', align: 'right' }
]

const walletRecords = ref([
  {
    id: 'WAL-SCH-0001',
    walletType: 'SCHOOL',
    owner: 'Ahmadu Bello University',
    tenant: 'Ahmadu Bello University',
    tenantType: 'SCHOOL',
    currentBalance: 8250000,
    availableBalance: 8250000,
    pendingBalance: 0,
    status: 'ACTIVE',
    riskScore: 5,
    anomalyScore: 0.01,
    fraudFlags: [],
    createdDate: new Date(Date.now() - 31536000000).toISOString(),
    lastActivity: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'WAL-RET-0092',
    walletType: 'MERCHANT',
    owner: 'Shoprite Ikeja',
    tenant: 'Shoprite Mega Store',
    tenantType: 'RETAIL',
    currentBalance: -150000,
    availableBalance: -150000,
    pendingBalance: 450000,
    status: 'SUSPENDED',
    riskScore: 85,
    anomalyScore: 0.88,
    fraudFlags: ['NEGATIVE_BALANCE', 'VELOCITY_SPIKE'],
    createdDate: new Date(Date.now() - 15768000000).toISOString(),
    lastActivity: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'WAL-CUS-8812',
    walletType: 'CUSTOMER',
    owner: 'John Doe',
    tenant: 'Invify Core',
    tenantType: 'PLATFORM',
    currentBalance: 12500,
    availableBalance: 12500,
    pendingBalance: 0,
    status: 'DORMANT',
    riskScore: 12,
    anomalyScore: 0.05,
    fraudFlags: [],
    createdDate: new Date(Date.now() - 63072000000).toISOString(),
    lastActivity: new Date(Date.now() - 31536000000).toISOString()
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
