<!-- invify-admin/src/pages/finance/SettlementWorkspacePage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Health Score -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Treasury Operations Center</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Settlement Workspace
          </div>
        </div>

        <!-- Settlement Health Score Panel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 20px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Health Score:</span>
            <span class="text-green-4 text-weight-bold text-subtitle2">99.7%</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Status:</span>
            <q-badge color="green-10" text-color="green-3">Healthy</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Outstanding Exposure:</span>
            <span class="text-amber-4 text-weight-bold">{{ currentCurrency.symbol }}12.5M</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Failed Settlements:</span>
            <span class="text-red-4 text-weight-bold">0</span>
          </div>
          <q-icon name="account_balance" color="green-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh Data" class="text-caption text-weight-bold" />
        <q-btn outline size="xs" color="amber-4" icon="approval" label="Pending Approvals (2)" class="text-caption text-weight-bold text-black" @click="activeWorkspaceTab = 'approvals'" />
        <q-btn-dropdown size="xs" color="indigo-4" icon="assessment" label="Reports" class="text-caption text-weight-bold text-white" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Daily Settlement Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Tenant Settlement Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Treasury Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Exposure Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Failed Settlement Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Settlement Audit Report</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn-dropdown outline size="xs" color="grey-6" icon="download" label="Export" class="text-caption text-weight-bold" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>CSV</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Excel</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>PDF</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- Treasury KPI Dashboard -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Total Settled Today</div>
          <div class="text-h5 text-metric-mono text-green-4">{{ currentCurrency.symbol }}4.2B <q-icon name="trending_up" size="xs"/></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Pending Settlements</div>
          <div class="text-h5 text-metric-mono text-amber-5">142</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Settlement Volume</div>
          <div class="text-h5 text-metric-mono text-cyan-4">84,201</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-purple-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Settlement Fees Collected</div>
          <div class="text-h5 text-metric-mono text-purple-4">{{ currentCurrency.symbol }}1.2M</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Treasury Float</div>
          <div class="text-h5 text-metric-mono text-indigo-4">{{ currentCurrency.symbol }}450.5M</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Failed / Disputed</div>
          <div class="text-h5 text-metric-mono text-red-4">0 / 2</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Queue Tabs & Command Bar Search -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-sm">
        <q-tabs v-model="activeWorkspaceTab" dense class="text-grey-5" active-color="amber-4" indicator-color="amber-4" align="left">
          <q-tab name="batches" label="Settlement Batches" icon="dynamic_feed" />
          <q-tab name="approvals" label="Approval Engine" icon="verified_user" />
          <q-tab name="failures" label="Failures & Disputes" icon="gavel" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="filter_list" color="grey-5" size="sm"><q-tooltip>Advanced Filters</q-tooltip></q-btn>
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search BATCH, REF, TENANT, WALLET..." class="text-caption" style="width: 280px;">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeWorkspaceTab" animated class="bg-transparent col" keep-alive>
        
        <!-- BATCHES PANEL (Grid) -->
        <q-tab-panel name="batches" class="q-pa-none column no-wrap">
          <div class="bg-subpanel border-bottom">
            <q-tabs v-model="activeQueueTab" dense class="text-grey-5 font-mono text-caption" active-color="cyan-4" align="left" no-caps>
              <q-tab name="generated" label="Generated" />
              <q-tab name="pending_approval" label="Pending Approval" />
              <q-tab name="approved" label="Approved" />
              <q-tab name="queued" label="Queued" />
              <q-tab name="processing" label="Processing" />
              <q-tab name="settled" label="Settled" />
              <q-tab name="failed" label="Failed" />
            </q-tabs>
          </div>
          
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="settlementRecords"
            :columns="settlementCols"
            row-key="id"
            dense
            virtual-scroll
            style="height: 100%;"
            selection="multiple"
            v-model:selected="selectedRecords"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-amber-3 cursor-pointer text-weight-bold hover-underline" @click="inspectSettlement(props.row)">
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
            <template v-slot:body-cell-netAmount="props">
              <q-td :props="props" class="font-mono text-weight-bold text-green-4 text-right">
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

        <!-- APPROVALS -->
        <q-tab-panel name="approvals" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Settlement Approval Engine</div>
          <!-- Placeholder -->
        </q-tab-panel>

        <!-- FAILURES -->
        <q-tab-panel name="failures" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Failures & Disputes</div>
          <!-- Placeholder -->
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- SETTLEMENT INSPECTION DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="850">
      <div v-if="selectedSettlement" class="column full-height">
        
        <!-- Drawer Header & Action Center -->
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="indigo-10" text-color="indigo-3" label="SETTLEMENT COMMAND" />
                <div class="text-h5 font-mono text-main">{{ selectedSettlement.id }}</div>
                <q-badge :color="getStatusColor(selectedSettlement.status)" text-color="dark">{{ selectedSettlement.status }}</q-badge>
              </div>
              <div class="text-caption text-muted font-mono">Reference: {{ selectedSettlement.reference }} | Created: {{ selectedSettlement.createdDate }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- Treasury Action Center -->
          <div class="row items-center op-gap-8 bg-dark q-pa-sm rounded-borders border-muted">
            <div class="text-caption font-mono text-muted q-mr-sm">ACTIONS:</div>
            <q-btn outline size="xs" color="cyan-4" icon="receipt_long" label="View Ledger" />
            <q-btn outline size="xs" color="amber-4" icon="compare_arrows" label="View Reconciliation" />
            <q-btn outline size="xs" color="green-4" icon="thumb_up" label="Approve Settlement" v-if="selectedSettlement.status === 'PENDING_APPROVAL'" />
            <q-btn outline size="xs" color="red-4" icon="thumb_down" label="Reject" v-if="selectedSettlement.status === 'PENDING_APPROVAL'" />
            <q-btn outline size="xs" color="orange-4" icon="pan_tool" label="Hold Settlement" />
            <q-btn outline size="xs" color="red-5" icon="gavel" label="Suspend Tenant" />
            <q-space />
            <q-btn outline size="xs" color="grey-6" icon="picture_as_pdf" label="Generate Report" />
          </div>
        </div>

        <!-- Drawer Tabs -->
        <q-tabs v-model="drawerTab" dense class="text-grey-5 font-mono text-caption border-bottom" active-color="amber-4" align="left" no-caps>
          <q-tab name="overview" label="Overview" />
          <q-tab name="transactions" label="Transactions" />
          <q-tab name="ledger" label="Ledger Mapping" />
          <q-tab name="flow" label="Treasury Flow" />
          <q-tab name="approvals" label="Approvals" />
          <q-tab name="bank" label="Bank Processing" />
          <q-tab name="reconciliation" label="Reconciliation" />
          <q-tab name="audit" label="Audit Trail" />
          <q-tab name="timeline" label="Timeline" />
          <q-tab name="related" label="Related" />
          <q-tab name="risk" label="Risk Analysis" />
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
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Settlement Financials</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Gross Amount:</span><span class="text-main">{{ currentCurrency.symbol }}{{ selectedSettlement.grossAmount.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Fees:</span><span class="text-red-4">- {{ currentCurrency.symbol }}{{ selectedSettlement.feeAmount.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Commission:</span><span class="text-red-4">- {{ currentCurrency.symbol }}{{ selectedSettlement.commissionAmount.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mt-sm border-top q-pt-sm font-mono text-weight-bold"><span class="text-muted">Net Amount:</span><span class="text-green-4">{{ currentCurrency.symbol }}{{ selectedSettlement.netAmount.toLocaleString() }}</span></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Tenant & Destination</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant:</span><span class="text-main">{{ selectedSettlement.tenant }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant Type:</span><span class="text-cyan-4">{{ selectedSettlement.tenantType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Bank Name:</span><span class="text-amber-4">{{ selectedSettlement.bank }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Account:</span><span class="text-main">{{ selectedSettlement.accountMask }}</span></div>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- TREASURY FLOW -->
            <q-tab-panel name="flow" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono">
                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-cyan-left" style="width: 300px;">
                  <div class="text-cyan-4 text-weight-bold">End-User Customers</div>
                  <div class="text-muted text-caption">Originating Payments</div>
                </div>
                <div class="q-py-xs"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>
                
                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-amber-left" style="width: 300px;">
                  <div class="text-amber-4 text-weight-bold">Invify Master Ledger</div>
                  <div class="text-muted text-caption">Aggregation & Fee Deduction</div>
                </div>
                <div class="q-py-xs"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>

                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-indigo-left" style="width: 300px;">
                  <div class="text-indigo-4 text-weight-bold">Settlement Batch Engine</div>
                  <div class="text-muted text-caption">{{ selectedSettlement.id }}</div>
                  <div class="text-green-4 text-weight-bold q-mt-xs">Net: {{ currentCurrency.symbol }}{{ selectedSettlement.netAmount.toLocaleString() }}</div>
                </div>
                <div class="q-py-xs"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>

                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center" style="width: 300px;">
                  <div class="text-white text-weight-bold">Treasury Payout Account</div>
                  <div class="text-muted text-caption">Invify Corporate Float</div>
                </div>
                <div class="q-py-xs"><q-icon name="arrow_downward" color="grey-6" size="sm" /></div>

                <div class="q-pa-sm border-muted rounded-borders bg-dark text-center border-green-left" style="width: 300px;">
                  <div class="text-green-4 text-weight-bold">Tenant Bank Account</div>
                  <div class="text-muted text-caption">{{ selectedSettlement.bank }} ({{ selectedSettlement.accountMask }})</div>
                </div>
              </div>
            </q-tab-panel>

            <!-- BANK PROCESSING -->
            <q-tab-panel name="bank" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">NIP Reference:</span><span class="text-cyan-4">NIP/00020/260531/XYZ</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Transfer Status:</span><span class="text-green-4">SUCCESS</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Response Code:</span><span class="text-main">00</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Response Message:</span><span class="text-main">Approved or completed successfully</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Retry Count:</span><span class="text-main">0</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Processing Time:</span><span class="text-main">42ms</span></div>
              </div>
            </q-tab-panel>

            <!-- RISK ANALYSIS -->
            <q-tab-panel name="risk" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row items-center op-gap-8 q-mb-md">
                  <q-circular-progress show-value class="text-caption text-white" :value="selectedSettlement.riskScore" size="50px" :color="selectedSettlement.riskScore > 80 ? 'red-5' : 'green-5'" track-color="dark" thickness="0.3">{{ selectedSettlement.riskScore }}</q-circular-progress>
                  <div>
                    <div class="text-weight-bold">Treasury Risk Assessment</div>
                    <div class="text-caption text-muted">AI Anomaly Score: {{ selectedSettlement.anomalyScore }}</div>
                  </div>
                </div>
                <div class="text-caption text-muted border-bottom q-pb-xs q-mb-sm">Fraud Flags Detected</div>
                <div class="row op-gap-8">
                  <q-badge color="red-10" text-color="red-3" v-for="flag in selectedSettlement.fraudFlags" :key="flag">{{ flag }}</q-badge>
                  <span v-if="!selectedSettlement.fraudFlags || selectedSettlement.fraudFlags.length === 0" class="text-green-4">None Detected</span>
                </div>
              </div>
            </q-tab-panel>

            <!-- PLACEHOLDERS FOR OTHERS -->
            <q-tab-panel name="transactions" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Batch Transactions View</div></q-tab-panel>
            <q-tab-panel name="ledger" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Ledger Mapping View</div></q-tab-panel>
            <q-tab-panel name="approvals" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Approval Workflow View</div></q-tab-panel>
            <q-tab-panel name="reconciliation" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Reconciliation Engine View</div></q-tab-panel>
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
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref } from 'vue'

const activeWorkspaceTab = ref('batches')
const activeQueueTab = ref('settled')
const searchQuery = ref('')
const selectedRecords = ref([])

const drawerOpen = ref(false)
const drawerTab = ref('overview')
const selectedSettlement = ref(null)

const inspectSettlement = (row) => {
  selectedSettlement.value = row
  drawerOpen.value = true
  drawerTab.value = 'overview'
}

const getStatusColor = (status) => {
  const map = {
    'SETTLED': 'green-4',
    'APPROVED': 'cyan-4',
    'PENDING_APPROVAL': 'amber-4',
    'PROCESSING': 'indigo-4',
    'FAILED': 'red-4'
  }
  return map[status] || 'grey-4'
}

// INVESTIGATION GRID DATA
const settlementCols = [
  { name: 'id', label: 'BATCH ID', field: 'id', align: 'left' },
  { name: 'reference', label: 'REFERENCE', field: 'reference', align: 'left' },
  { name: 'tenant', label: 'TENANT', field: 'tenant', align: 'left' },
  { name: 'tenantType', label: 'TYPE', field: 'tenantType', align: 'left' },
  { name: 'bank', label: 'BANK', field: 'bank', align: 'left' },
  { name: 'txnCount', label: 'TXNS', field: 'txnCount', align: 'right' },
  { name: 'gross', label: 'GROSS (₦)', field: 'grossAmount', align: 'right' },
  { name: 'fee', label: 'FEE (₦)', field: 'feeAmount', align: 'right' },
  { name: 'netAmount', label: 'NET PAYOUT (₦)', field: 'netAmount', align: 'right' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' },
  { name: 'settlementDate', label: 'SETTLED', field: 'settlementDate', align: 'right' }
]

const settlementRecords = ref([
  {
    id: 'SET-20260531-0001',
    reference: 'STL/260531/0001',
    tenant: 'Ahmadu Bello University',
    tenantType: 'SCHOOL',
    walletId: 'WAL-SCH-0001',
    bank: 'GTBank',
    accountMask: '****1234',
    txnCount: 12500,
    grossAmount: 45000000,
    feeAmount: 450000,
    commissionAmount: 50000,
    netAmount: 44500000,
    status: 'SETTLED',
    approvalStatus: 'APPROVED',
    riskScore: 5,
    anomalyScore: 0.01,
    fraudFlags: [],
    createdDate: new Date(Date.now() - 86400000).toISOString(),
    settlementDate: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'SET-20260531-0002',
    reference: 'STL/260531/0002',
    tenant: 'Shoprite Mega Store',
    tenantType: 'RETAIL',
    walletId: 'WAL-RET-0092',
    bank: 'Zenith Bank',
    accountMask: '****8842',
    txnCount: 3400,
    grossAmount: 12500000,
    feeAmount: 125000,
    commissionAmount: 0,
    netAmount: 12375000,
    status: 'PENDING_APPROVAL',
    approvalStatus: 'PENDING',
    riskScore: 65,
    anomalyScore: 0.68,
    fraudFlags: ['UNUSUAL_VOLUME'],
    createdDate: new Date(Date.now() - 3600000).toISOString(),
    settlementDate: 'N/A'
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

.border-cyan-left { border-left: 2px solid #22b8cf !important; }
.border-indigo-left { border-left: 2px solid #7048e8 !important; }
.border-amber-left { border-left: 2px solid #fcc419 !important; }
.border-green-left { border-left: 2px solid #51cf66 !important; }
.border-red-left { border-left: 2px solid #c92a2a !important; }
.border-purple-left { border-left: 2px solid #be4bdb !important; }
</style>
