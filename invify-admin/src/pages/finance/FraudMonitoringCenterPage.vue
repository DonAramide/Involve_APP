<!-- invify-admin/src/pages/finance/FraudMonitoringCenterPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Fraud Intelligence Center -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Risk & Anomaly Engine</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Fraud Monitoring Center
          </div>
        </div>

        <!-- Fraud Intelligence Subpanel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 20px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Top Fraud Pattern:</span>
            <span class="text-red-4 text-weight-bold text-subtitle2">Velocity Abuse</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Active Threats:</span>
            <q-badge color="red-10" text-color="red-3"><q-icon name="warning" size="xs" class="q-mr-xs"/>3 CRITICAL</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Risk Concentration:</span>
            <span class="text-amber-4 text-weight-bold">Agent Network (South West)</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">AI Forecast:</span>
            <span class="text-cyan-4 text-weight-bold">Elevated Weekend Risk</span>
          </div>
          <q-icon name="security" color="red-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh Alerts" class="text-caption text-weight-bold" />
        <q-btn outline size="xs" color="red-4" icon="gavel" label="Create SAR" class="text-caption text-weight-bold" />
        <q-btn-dropdown size="xs" color="indigo-4" icon="assessment" label="Fraud Reports" class="text-caption text-weight-bold text-white" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Daily Fraud Exposure</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Blocked Transactions Log</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>High Risk Entity Report</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- Fraud KPI Dashboard -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Open Cases / Critical</div>
          <div class="text-h5 text-metric-mono text-red-4">124 / 3</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Fraud Loss Exposure</div>
          <div class="text-h5 text-metric-mono text-amber-4">{{ currentCurrency.symbol }}14.5M</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-purple-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Blocked Txns (24h)</div>
          <div class="text-h5 text-metric-mono text-purple-4">1,402</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Account Takeovers / Tampering</div>
          <div class="text-h5 text-metric-mono text-indigo-4">12 / 4</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">High Risk (Wallets/Cards/Trm)</div>
          <div class="text-h5 text-metric-mono text-cyan-4">84 / 24 / 12</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Detection Rate / False +</div>
          <div class="text-h5 text-metric-mono text-green-4">99.1% / 0.8%</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Queue Tabs & Command Bar Search -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-sm">
        <q-tabs v-model="activeWorkspaceTab" dense class="text-grey-5" active-color="red-4" indicator-color="red-4" align="left">
          <q-tab name="investigation" label="Fraud Investigation Queue" icon="gavel" />
          <q-tab name="correlation" label="Threat Correlation Engine" icon="hub" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="filter_list" color="grey-5" size="sm"><q-tooltip>Advanced Filters</q-tooltip></q-btn>
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search CASE ID, TENANT, WALLET..." class="text-caption" style="width: 280px;">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeWorkspaceTab" animated class="bg-transparent col" keep-alive>
        
        <!-- FRAUD INVESTIGATION GRID PANEL -->
        <q-tab-panel name="investigation" class="q-pa-none column no-wrap">
          <div class="bg-subpanel border-bottom scroll-x">
            <q-tabs v-model="activeCategoryTab" dense class="text-grey-5 font-mono text-caption" active-color="cyan-4" align="left" no-caps>
              <q-tab name="transaction" label="Transaction" />
              <q-tab name="wallet" label="Wallet" />
              <q-tab name="card" label="Card" />
              <q-tab name="terminal" label="Terminal" />
              <q-tab name="device" label="Device" />
              <q-tab name="settlement" label="Settlement" />
              <q-separator vertical class="q-mx-sm bg-dark" />
              <q-tab name="ato" label="Account Takeover" />
              <q-tab name="velocity" label="Velocity Abuse" />
              <q-tab name="insider" label="Insider Threat" />
              <q-separator vertical class="q-mx-sm bg-dark" />
              <q-tab name="resolved" label="Resolved Cases" />
            </q-tabs>
          </div>
          
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="fraudRecords"
            :columns="fraudCols"
            row-key="id"
            dense
            virtual-scroll
            style="height: 100%;"
            selection="multiple"
            v-model:selected="selectedRecords"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-red-3 cursor-pointer text-weight-bold hover-underline" @click="inspectCase(props.row)">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-severity="props">
              <q-td :props="props" class="font-mono">
                <q-badge :color="getSeverityColor(props.value)" text-color="white" class="text-weight-bold">
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>
            <template v-slot:body-cell-exposure="props">
              <q-td :props="props" class="font-mono text-right text-amber-4 text-weight-bold">
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
            <template v-slot:body-cell-confidence="props">
              <q-td :props="props" class="font-mono text-center text-cyan-4">
                {{ props.value }}%
              </q-td>
            </template>
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="props.value === 'OPEN' ? 'red-10' : (props.value === 'INVESTIGATING' ? 'amber-10' : 'green-10')" :text-color="props.value === 'OPEN' ? 'red-3' : (props.value === 'INVESTIGATING' ? 'amber-3' : 'green-3')">
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- CORRELATION ENGINE -->
        <q-tab-panel name="correlation" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Threat Correlation Engine</div>
          <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted">
            <q-icon name="hub" size="xl" class="q-mb-md text-cyan-4" />
            <div class="text-cyan-4 text-weight-bold">Graph Analysis Active</div>
            <div class="text-caption q-mt-xs">Select a case to build correlation tree.</div>
          </div>
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- FRAUD INVESTIGATION DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="950">
      <div v-if="selectedCase" class="column full-height">
        
        <!-- Drawer Header & Action Center -->
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="red-10" text-color="red-3" label="FRAUD COMMAND" />
                <div class="text-h5 font-mono text-main">{{ selectedCase.id }}</div>
                <q-badge :color="getSeverityColor(selectedCase.severity)" text-color="white">{{ selectedCase.severity }}</q-badge>
                <q-badge :color="selectedCase.status === 'OPEN' ? 'red-10' : 'amber-10'" :text-color="selectedCase.status === 'OPEN' ? 'red-3' : 'amber-3'">{{ selectedCase.status }}</q-badge>
              </div>
              <div class="text-caption text-muted font-mono">Fraud Type: {{ selectedCase.fraudType }} | Investigator: {{ selectedCase.investigator }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- Operational Action Center -->
          <div class="row items-center op-gap-8 bg-dark q-pa-sm rounded-borders border-muted">
            <div class="text-caption font-mono text-muted q-mr-sm">ACTIONS:</div>
            <q-btn outline size="xs" color="cyan-4" icon="person_add" label="Assign to Me" />
            <q-btn outline size="xs" color="amber-4" icon="ac_unit" label="Freeze Wallet" />
            <q-btn outline size="xs" color="red-4" icon="block" label="Block Device / Card" />
            <q-btn outline size="xs" color="orange-4" icon="pan_tool" label="Hold Settlement" />
            <q-space />
            <q-btn outline size="xs" color="grey-6" icon="gavel" label="Create SAR" />
            <q-btn outline size="xs" color="grey-6" icon="done_all" label="Resolve Case" />
          </div>
        </div>

        <!-- Drawer Tabs -->
        <q-tabs v-model="drawerTab" dense class="text-grey-5 font-mono text-caption border-bottom scroll-x" active-color="red-4" align="left" no-caps>
          <q-tab name="overview" label="Overview" />
          <q-tab name="risk" label="Risk Analysis" />
          <q-tab name="transactions" label="Txn Analysis" />
          <q-tab name="wallets" label="Wallet Analysis" />
          <q-tab name="cards" label="Card Analysis" />
          <q-tab name="terminals" label="Terminal Analysis" />
          <q-tab name="devices" label="Device Analysis" />
          <q-tab name="settlements" label="Settlement Analysis" />
          <q-tab name="revenue" label="Revenue Impact" />
          <q-tab name="evidence" label="Evidence" />
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
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Case Details</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Fraud Type:</span><span class="text-cyan-4">{{ selectedCase.fraudType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Severity:</span><span class="text-red-4">{{ selectedCase.severity }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant:</span><span class="text-main">{{ selectedCase.tenant }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Created Date:</span><span class="text-main">{{ selectedCase.createdDate }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Assigned Investigator:</span><span class="text-amber-4">{{ selectedCase.investigator }}</span></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height bg-dark">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Exposure & Entities</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Linked Wallet:</span><span class="text-indigo-4">{{ selectedCase.wallet }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Linked Terminal:</span><span class="text-indigo-4">{{ selectedCase.terminal || 'N/A' }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Linked Device:</span><span class="text-cyan-4">{{ selectedCase.device || 'N/A' }}</span></div>
                    <div class="row justify-between q-mt-sm border-top q-pt-sm font-mono text-weight-bold"><span class="text-muted">Total Exposure:</span><span class="text-red-4 text-h6" style="line-height: 1;">{{ currentCurrency.symbol }}{{ selectedCase.exposure.toLocaleString() }}</span></div>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- RISK ANALYSIS -->
            <q-tab-panel name="risk" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row items-center op-gap-8 q-mb-md">
                  <q-circular-progress show-value class="text-caption text-white" :value="selectedCase.riskScore" size="50px" :color="selectedCase.riskScore > 80 ? 'red-5' : 'green-5'" track-color="dark" thickness="0.3">{{ selectedCase.riskScore }}</q-circular-progress>
                  <div>
                    <div class="text-weight-bold text-red-4">AI Threat Assessment</div>
                    <div class="text-caption text-muted">Anomaly Score: {{ selectedCase.anomalyScore }} | Confidence: {{ selectedCase.confidence }}%</div>
                    <div class="text-caption text-indigo-3">Threat Level: {{ selectedCase.severity }}</div>
                  </div>
                </div>
                <div class="text-caption text-muted border-bottom q-pb-xs q-mb-sm">Fraud Flags Triggered</div>
                <div class="row op-gap-8 q-mb-md">
                  <q-badge color="red-10" text-color="red-3" v-for="flag in selectedCase.fraudFlags" :key="flag">{{ flag }}</q-badge>
                </div>
                <div class="text-caption text-muted border-bottom q-pb-xs q-mb-sm">AI Recommended Action</div>
                <div class="text-amber-4 text-weight-bold">» {{ selectedCase.recommendedAction }}</div>
                <div class="text-caption text-muted q-mt-xs">Recovery Probability: {{ selectedCase.recoveryProbability }}%</div>
              </div>
            </q-tab-panel>

            <!-- DEVICE ANALYSIS -->
            <q-tab-panel name="devices" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md text-cyan-3">Device & Tamper Fingerprinting</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Device Fingerprint:</span><span class="text-main">FGRP-994A-21X</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Device Health:</span><span class="text-red-4">COMPROMISED</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Quasar Policy Compliance:</span><span class="text-red-4">TAMPER DETECTED</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Last Heartbeat:</span><span class="text-amber-4">2 mins ago (From suspicious IP)</span></div>
                <div class="q-mt-sm">
                  <q-btn outline size="xs" color="red-4" icon="block" label="Block Device in Quasar" />
                </div>
              </div>
            </q-tab-panel>

            <!-- CORRELATION ENGINE -->
            <q-tab-panel name="related" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md text-purple-3">Threat Correlation Graph</div>
                <div class="row items-center justify-between text-caption border-bottom q-pb-sm q-mb-sm">
                  <div class="column items-center"><q-icon name="smartphone" size="sm" class="text-cyan-4"/><span class="q-mt-xs">{{ selectedCase.device || 'N/A' }}</span></div>
                  <q-icon name="arrow_forward" class="text-muted" />
                  <div class="column items-center"><q-icon name="point_of_sale" size="sm" class="text-amber-4"/><span class="q-mt-xs">{{ selectedCase.terminal || 'N/A' }}</span></div>
                  <q-icon name="arrow_forward" class="text-muted" />
                  <div class="column items-center"><q-icon name="account_balance_wallet" size="sm" class="text-indigo-4"/><span class="q-mt-xs">{{ selectedCase.wallet || 'N/A' }}</span></div>
                  <q-icon name="arrow_forward" class="text-muted" />
                  <div class="column items-center"><q-icon name="receipt_long" size="sm" class="text-green-4"/><span class="q-mt-xs">TXN-991A</span></div>
                </div>
                <div class="text-muted text-center q-mt-md">All entities structurally linked.</div>
              </div>
            </q-tab-panel>

            <!-- PLACEHOLDERS FOR OTHERS -->
            <q-tab-panel name="transactions" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Transaction Velocity & Geographic Analysis</div></q-tab-panel>
            <q-tab-panel name="wallets" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Wallet Risk & Funding Pattern Analysis</div></q-tab-panel>
            <q-tab-panel name="cards" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Card Testing & Dispute Pattern Analysis</div></q-tab-panel>
            <q-tab-panel name="terminals" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Terminal Location & Merchant Activity Analysis</div></q-tab-panel>
            <q-tab-panel name="settlements" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Settlement Exposure & Risk Analysis</div></q-tab-panel>
            <q-tab-panel name="revenue" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Revenue Manipulation Impact Analysis</div></q-tab-panel>
            <q-tab-panel name="evidence" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Evidence Attachments & Screenshots</div></q-tab-panel>
            <q-tab-panel name="audit" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Security Event Audit Trail</div></q-tab-panel>
            <q-tab-panel name="timeline" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Chronological Fraud Reconstruction</div></q-tab-panel>
            <q-tab-panel name="resolution" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Resolution & Recovery Actions</div></q-tab-panel>

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

const activeWorkspaceTab = ref('investigation')
const activeCategoryTab = ref('velocity')
const searchQuery = ref('')
const selectedRecords = ref([])

const drawerOpen = ref(false)
const drawerTab = ref('overview')
const selectedCase = ref(null)

const inspectCase = (row) => {
  selectedCase.value = row
  drawerOpen.value = true
  drawerTab.value = 'overview'
}

const getSeverityColor = (severity) => {
  const map = {
    'CRITICAL': 'purple-6',
    'HIGH': 'red-5',
    'MEDIUM': 'amber-5',
    'LOW': 'green-5'
  }
  return map[severity] || 'grey-5'
}

// INVESTIGATION GRID DATA
const fraudCols = [
  { name: 'id', label: 'CASE ID', field: 'id', align: 'left' },
  { name: 'fraudType', label: 'FRAUD TYPE', field: 'fraudType', align: 'left' },
  { name: 'severity', label: 'SEVERITY', field: 'severity', align: 'center' },
  { name: 'tenant', label: 'TENANT', field: 'tenant', align: 'left' },
  { name: 'wallet', label: 'WALLET LINK', field: 'wallet', align: 'left' },
  { name: 'exposure', label: 'EXPOSURE (₦)', field: 'exposure', align: 'right' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' },
  { name: 'confidence', label: 'CONFIDENCE', field: 'confidence', align: 'center' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'investigator', label: 'INVESTIGATOR', field: 'investigator', align: 'left' }
]

const fraudRecords = ref([
  {
    id: 'CAS-2026-8812',
    fraudType: 'VELOCITY_ABUSE',
    severity: 'CRITICAL',
    tenant: 'Invify Agency Network',
    tenantType: 'AGENT',
    wallet: 'WAL-AGT-8812',
    terminal: 'TRM-AGT-0012',
    device: 'DEV-AND-991',
    exposure: 2450000,
    riskScore: 98,
    anomalyScore: 0.99,
    confidence: 96,
    status: 'OPEN',
    investigator: 'Unassigned',
    createdDate: '2026-05-30',
    fraudFlags: ['VELOCITY_SPIKE', 'MULTIPLE_DECLINES', 'UNUSUAL_GEO'],
    recommendedAction: 'Freeze Wallet & Block Terminal',
    recoveryProbability: 45
  },
  {
    id: 'CAS-2026-8813',
    fraudType: 'DEVICE_TAMPERING',
    severity: 'HIGH',
    tenant: 'Shoprite Mega Store',
    tenantType: 'RETAIL',
    wallet: 'WAL-RET-0091',
    terminal: 'TRM-MER-0091',
    device: 'DEV-AND-004',
    exposure: 850000,
    riskScore: 88,
    anomalyScore: 0.91,
    confidence: 92,
    status: 'INVESTIGATING',
    investigator: 'M. Ojo',
    createdDate: '2026-05-29',
    fraudFlags: ['DEVICE_TAMPER_SUSPECTED', 'ROOT_DETECTED'],
    recommendedAction: 'Suspend Terminal Operations',
    recoveryProbability: 80
  },
  {
    id: 'CAS-2026-8814',
    fraudType: 'ACCOUNT_TAKEOVER',
    severity: 'HIGH',
    tenant: 'Ahmadu Bello University',
    tenantType: 'SCHOOL',
    wallet: 'WAL-SCH-1122',
    terminal: null,
    device: 'DEV-IOS-211',
    exposure: 450000,
    riskScore: 85,
    anomalyScore: 0.89,
    confidence: 85,
    status: 'OPEN',
    investigator: 'Unassigned',
    createdDate: '2026-05-30',
    fraudFlags: ['NEW_DEVICE_LOGIN', 'PASSWORD_RESET_SPIKE'],
    recommendedAction: 'Force Logout & Freeze Wallet',
    recoveryProbability: 60
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
