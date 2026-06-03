<!-- invify-admin/src/pages/finance/TerminalOperationsCenterPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Terminal Health -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Fleet & Transaction Command Center</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Terminal Operations Center
          </div>
        </div>

        <!-- Terminal Health Score Panel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 20px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Health Score:</span>
            <span class="text-green-4 text-weight-bold text-subtitle2">99.3%</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Status:</span>
            <q-badge color="green-10" text-color="green-3">Healthy</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Offline Fleet:</span>
            <span class="text-amber-4 text-weight-bold">120 (4%)</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Sync Failures:</span>
            <span class="text-red-4 text-weight-bold">12</span>
          </div>
          <q-icon name="point_of_sale" color="green-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh Sync" class="text-caption text-weight-bold" />
        <q-btn-dropdown size="xs" color="indigo-4" icon="router" label="Assignment Center" class="text-caption text-weight-bold text-white" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Assign Terminal</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Transfer Ownership</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Bulk Assignment</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn-dropdown outline size="xs" color="grey-6" icon="download" label="Export Fleet" class="text-caption text-weight-bold" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>CSV</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Excel</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>PDF Fleet Report</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- Terminal KPI Dashboard -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Total / Active Terminals</div>
          <div class="text-h5 text-metric-mono text-cyan-4">8.4K / 8.1K</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Total Transaction Vol</div>
          <div class="text-h5 text-metric-mono text-green-4">{{ currentCurrency.symbol }}450.2M <q-icon name="trending_up" size="xs"/></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Online / Offline Fleet</div>
          <div class="text-h5 text-metric-mono text-amber-5">8,280 / 120</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Fraud Alerts / Suspended</div>
          <div class="text-h5 text-metric-mono text-red-5">14 / 8</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Terminal Utilization</div>
          <div class="text-h5 text-metric-mono text-indigo-4">88.4%</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-purple-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Settlement Value</div>
          <div class="text-h5 text-metric-mono text-purple-4">{{ currentCurrency.symbol }}448.5M</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Queue Tabs & Command Bar Search -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-sm">
        <q-tabs v-model="activeWorkspaceTab" dense class="text-grey-5" active-color="amber-4" indicator-color="amber-4" align="left">
          <q-tab name="fleet" label="Terminal Fleet" icon="point_of_sale" />
          <q-tab name="assignment" label="Assignment Integrity" icon="compare_arrows" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="filter_list" color="grey-5" size="sm"><q-tooltip>Advanced Filters</q-tooltip></q-btn>
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search TRM ID, DEV ID, TENANT..." class="text-caption" style="width: 280px;">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeWorkspaceTab" animated class="bg-transparent col" keep-alive>
        
        <!-- TERMINAL FLEET GRID PANEL -->
        <q-tab-panel name="fleet" class="q-pa-none column no-wrap">
          <div class="bg-subpanel border-bottom scroll-x">
            <q-tabs v-model="activeCategoryTab" dense class="text-grey-5 font-mono text-caption" active-color="cyan-4" align="left" no-caps>
              <q-tab name="active" label="Active" />
              <q-tab name="inactive" label="Inactive" />
              <q-tab name="offline" label="Offline" />
              <q-tab name="suspended" label="Suspended" />
              <q-tab name="highrisk" label="High Risk" />
              <q-separator vertical class="q-mx-sm bg-dark" />
              <q-tab name="merchant" label="Merchant" />
              <q-tab name="school" label="School" />
              <q-tab name="agent" label="Agent" />
              <q-tab name="mpos" label="MPOS" />
              <q-tab name="softpos" label="SoftPOS" />
            </q-tabs>
          </div>
          
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="terminalRecords"
            :columns="terminalCols"
            row-key="id"
            dense
            virtual-scroll
            style="height: 100%;"
            selection="multiple"
            v-model:selected="selectedRecords"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-amber-3 cursor-pointer text-weight-bold hover-underline" @click="inspectTerminal(props.row)">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-deviceSync="props">
              <q-td :props="props" class="font-mono text-cyan-3">
                <q-icon name="smartphone" size="xs" class="q-mr-xs opacity-50" />
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
            <template v-slot:body-cell-onlineStatus="props">
              <q-td :props="props">
                <q-icon :name="props.value === 'ONLINE' ? 'wifi' : 'wifi_off'" :color="props.value === 'ONLINE' ? 'green-4' : 'red-4'" size="xs" />
                <span class="font-mono text-caption q-ml-xs">{{ props.value }}</span>
              </q-td>
            </template>
            <template v-slot:body-cell-battery="props">
              <q-td :props="props" class="font-mono">
                <q-icon :name="props.value > 20 ? 'battery_full' : 'battery_alert'" :color="props.value > 20 ? 'green-4' : 'red-4'" size="xs" />
                {{ props.value }}%
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

        <!-- ASSIGNMENT INTEGRITY -->
        <q-tab-panel name="assignment" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Terminal Uniqueness & Assignment Monitor</div>
          <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted">
            <q-icon name="verified_user" size="xl" class="q-mb-md text-green-4" />
            <div class="text-green-4 text-weight-bold">100% Uniqueness Verified</div>
            <div class="text-caption q-mt-xs">0 Duplicate MPOS IDs • 0 Multiple Device Assignments</div>
          </div>
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- TERMINAL INSPECTION DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="950">
      <div v-if="selectedTerminal" class="column full-height">
        
        <!-- Drawer Header & Action Center -->
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="indigo-10" text-color="indigo-3" label="TERMINAL COMMAND" />
                <div class="text-h5 font-mono text-main">{{ selectedTerminal.id }}</div>
                <q-badge :color="getStatusColor(selectedTerminal.status)" text-color="dark">{{ selectedTerminal.status }}</q-badge>
                <q-icon :name="selectedTerminal.onlineStatus === 'ONLINE' ? 'wifi' : 'wifi_off'" :color="selectedTerminal.onlineStatus === 'ONLINE' ? 'green-4' : 'red-4'" size="xs" />
              </div>
              <div class="text-caption text-muted font-mono">Assigned To: {{ selectedTerminal.assignedUser }} | MPOS ID: {{ selectedTerminal.mposId || 'N/A' }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- Operational Action Center -->
          <div class="row items-center op-gap-8 bg-dark q-pa-sm rounded-borders border-muted">
            <div class="text-caption font-mono text-muted q-mr-sm">ACTIONS:</div>
            <q-btn outline size="xs" color="cyan-4" icon="router" label="Reassign Terminal" />
            <q-btn outline size="xs" color="amber-4" icon="ac_unit" label="Suspend Terminal" v-if="selectedTerminal.status === 'ACTIVE'" />
            <q-btn outline size="xs" color="green-4" icon="lock_open" label="Reactivate" v-if="selectedTerminal.status !== 'ACTIVE'" />
            <q-btn outline size="xs" color="orange-4" icon="smartphone" label="Unassign Device" />
            <q-space />
            <q-btn outline size="xs" color="grey-6" icon="receipt_long" label="View Transactions" />
            <q-btn outline size="xs" color="grey-6" icon="account_balance_wallet" label="View Wallet" />
          </div>
        </div>

        <!-- Drawer Tabs -->
        <q-tabs v-model="drawerTab" dense class="text-grey-5 font-mono text-caption border-bottom scroll-x" active-color="amber-4" align="left" no-caps>
          <q-tab name="overview" label="Overview" />
          <q-tab name="device" label="Device Relationship" />
          <q-tab name="transactions" label="Transaction Activity" />
          <q-tab name="settlement" label="Settlement Activity" />
          <q-tab name="wallet" label="Wallet Sync" />
          <q-tab name="card" label="Card Activity" />
          <q-tab name="ledger" label="Ledger Impact" />
          <q-tab name="risk" label="Risk Analysis" />
          <q-tab name="compliance" label="Compliance" />
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
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Terminal Profile</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Terminal Type:</span><span class="text-cyan-4">{{ selectedTerminal.type }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant:</span><span class="text-main">{{ selectedTerminal.tenant }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant Type:</span><span class="text-main">{{ selectedTerminal.tenantType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Created Date:</span><span class="text-main">{{ selectedTerminal.createdDate }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Last Active:</span><span class="text-amber-4">{{ selectedTerminal.lastSync }}</span></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height bg-dark">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Revenue & Processing Hooks</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Total Processed Vol:</span><span class="text-green-4">{{ currentCurrency.symbol }}14,250,000</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Terminal Txns:</span><span class="text-main">{{ selectedTerminal.txnCount }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Terminal Revenue Generated:</span><span class="text-purple-4">{{ currentCurrency.symbol }}125,000</span></div>
                    <div class="row justify-between q-mt-sm border-top q-pt-sm font-mono text-weight-bold"><span class="text-muted">Settlement Mapping:</span><span class="text-indigo-4">SET-BATCH-841</span></div>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- DEVICE RELATIONSHIP (QUASAR MDM) -->
            <q-tab-panel name="device" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row justify-between q-mb-md">
                  <div class="text-weight-bold text-cyan-3">Quasar Fleet Integration</div>
                  <q-badge color="indigo-10" text-color="indigo-3">ENROLLED</q-badge>
                </div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Device ID:</span><span class="text-main">{{ selectedTerminal.deviceSync }}</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Device Name:</span><span class="text-main">{{ selectedTerminal.deviceName }}</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Android Version:</span><span class="text-main">Android 12</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Policy Status:</span><span class="text-green-4">COMPLIANT</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Battery Health:</span><span :class="selectedTerminal.battery > 20 ? 'text-green-4' : 'text-red-4'">{{ selectedTerminal.battery }}%</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">App Catalog Status:</span><span class="text-main">Up-to-date (v2.4.1)</span></div>
                <div class="q-mt-sm">
                  <q-btn outline size="xs" color="cyan-4" icon="open_in_new" label="Open in Quasar Fleet" />
                </div>
              </div>
            </q-tab-panel>

            <!-- RISK ANALYSIS -->
            <q-tab-panel name="risk" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row items-center op-gap-8 q-mb-md">
                  <q-circular-progress show-value class="text-caption text-white" :value="selectedTerminal.riskScore" size="50px" :color="selectedTerminal.riskScore > 80 ? 'red-5' : 'green-5'" track-color="dark" thickness="0.3">{{ selectedTerminal.riskScore }}</q-circular-progress>
                  <div>
                    <div class="text-weight-bold">Fraud & Risk Assessment</div>
                    <div class="text-caption text-muted">AI Anomaly Score: {{ selectedTerminal.anomalyScore }}</div>
                    <div class="text-caption text-indigo-3">Terminal Cloning Risk: LOW</div>
                  </div>
                </div>
                <div class="text-caption text-muted border-bottom q-pb-xs q-mb-sm">Fraud, Tamper & Velocity Flags</div>
                <div class="row op-gap-8">
                  <q-badge color="red-10" text-color="red-3" v-for="flag in selectedTerminal.fraudFlags" :key="flag">{{ flag }}</q-badge>
                  <span v-if="!selectedTerminal.fraudFlags || selectedTerminal.fraudFlags.length === 0" class="text-green-4">None Detected</span>
                </div>
              </div>
            </q-tab-panel>

            <!-- COMPLIANCE -->
            <q-tab-panel name="compliance" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md">Terminal Certification & Merchant Compliance</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Merchant KYC Status:</span><span class="text-green-4">TIER 3 (VERIFIED)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">AML Status:</span><span class="text-green-4">CLEARED</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Terminal Certification (PCI):</span><span class="text-green-4">VALID</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Regulatory Flags:</span><span class="text-main">None</span></div>
              </div>
            </q-tab-panel>

            <!-- PLACEHOLDERS FOR OTHERS -->
            <q-tab-panel name="transactions" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Transaction Activity View</div></q-tab-panel>
            <q-tab-panel name="settlement" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Settlement & Batch Sync View</div></q-tab-panel>
            <q-tab-panel name="wallet" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Associated Wallet View</div></q-tab-panel>
            <q-tab-panel name="card" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Linked Card Activity View</div></q-tab-panel>
            <q-tab-panel name="ledger" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Ledger Impact View</div></q-tab-panel>
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

const activeWorkspaceTab = ref('fleet')
const activeCategoryTab = ref('active')
const searchQuery = ref('')
const selectedRecords = ref([])

const drawerOpen = ref(false)
const drawerTab = ref('overview')
const selectedTerminal = ref(null)

const inspectTerminal = (row) => {
  selectedTerminal.value = row
  drawerOpen.value = true
  drawerTab.value = 'overview'
}

const getStatusColor = (status) => {
  const map = {
    'ACTIVE': 'green-4',
    'INACTIVE': 'grey-5',
    'SUSPENDED': 'amber-4',
    'BLOCKED': 'red-4'
  }
  return map[status] || 'grey-4'
}

// INVESTIGATION GRID DATA
const terminalCols = [
  { name: 'id', label: 'TERMINAL ID', field: 'id', align: 'left' },
  { name: 'mposId', label: 'MPOS ID', field: 'mposId', align: 'left' },
  { name: 'deviceSync', label: 'DEVICE SYNC', field: 'deviceSync', align: 'left' },
  { name: 'type', label: 'TYPE', field: 'type', align: 'left' },
  { name: 'tenant', label: 'TENANT', field: 'tenant', align: 'left' },
  { name: 'assignedUser', label: 'ASSIGNED TO', field: 'assignedUser', align: 'left' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'onlineStatus', label: 'NETWORK', field: 'onlineStatus', align: 'center' },
  { name: 'battery', label: 'BATT', field: 'battery', align: 'center' },
  { name: 'txnCount', label: 'TXNS', field: 'txnCount', align: 'right' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' },
  { name: 'lastSync', label: 'LAST SYNC', field: 'lastSync', align: 'right' }
]

const terminalRecords = ref([
  {
    id: 'TRM-AGT-0012',
    mposId: 'MPOS-9941-X',
    deviceSync: 'DEV-AND-991',
    deviceName: 'Samsung Galaxy A12',
    type: 'MPOS TERMINAL',
    tenant: 'Invify Agency Network',
    tenantType: 'PLATFORM',
    assignedUser: 'Sarah Agent',
    status: 'ACTIVE',
    onlineStatus: 'ONLINE',
    battery: 84,
    txnCount: 12450,
    riskScore: 12,
    anomalyScore: 0.05,
    fraudFlags: [],
    createdDate: '2025-10-12',
    lastSync: '2 mins ago'
  },
  {
    id: 'TRM-SCH-0044',
    mposId: null,
    deviceSync: 'DEV-IOS-211',
    deviceName: 'iPhone 13',
    type: 'SOFTPOS TERMINAL',
    tenant: 'Ahmadu Bello University',
    tenantType: 'SCHOOL',
    assignedUser: 'Bursary Admin 1',
    status: 'ACTIVE',
    onlineStatus: 'OFFLINE',
    battery: 15,
    txnCount: 890,
    riskScore: 25,
    anomalyScore: 0.12,
    fraudFlags: [],
    createdDate: '2026-02-14',
    lastSync: '4 hrs ago'
  },
  {
    id: 'TRM-MER-0091',
    mposId: 'MPOS-8822-Y',
    deviceSync: 'DEV-AND-004',
    deviceName: 'Tecno Spark 10',
    type: 'MPOS TERMINAL',
    tenant: 'Shoprite Mega Store',
    tenantType: 'MERCHANT',
    assignedUser: 'Checkout Counter 4',
    status: 'SUSPENDED',
    onlineStatus: 'ONLINE',
    battery: 98,
    txnCount: 450,
    riskScore: 88,
    anomalyScore: 0.91,
    fraudFlags: ['DEVICE_TAMPER_SUSPECTED', 'VELOCITY_SPIKE'],
    createdDate: '2025-11-20',
    lastSync: '1 min ago'
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
