<!-- invify-admin/src/pages/finance/AuditWorkspacePage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Compliance Health -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Governance & Compliance Command Center</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Audit Workspace
          </div>
        </div>

        <!-- Compliance Health Score Panel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 20px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Compliance Score:</span>
            <span class="text-green-4 text-weight-bold text-subtitle2">99.6%</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Status:</span>
            <q-badge color="green-10" text-color="green-3">Healthy</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Open Violations:</span>
            <span class="text-amber-4 text-weight-bold">0</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Critical Findings:</span>
            <span class="text-red-4 text-weight-bold">0</span>
          </div>
          <q-icon name="verified_user" color="green-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh Log" class="text-caption text-weight-bold" />
        <q-btn-dropdown size="xs" color="indigo-4" icon="assessment" label="Governance Reports" class="text-caption text-weight-bold text-white" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Comprehensive Audit Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Compliance & Regulatory Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Security Incidents Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>User Activity Audit</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Fraud Investigation Report</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn-dropdown outline size="xs" color="grey-6" icon="download" label="Export Events" class="text-caption text-weight-bold" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>CSV</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Excel</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>PDF (Signed)</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- Governance KPI Dashboard -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Total Audit Events</div>
          <div class="text-h5 text-metric-mono text-cyan-4">8.2M <q-icon name="trending_up" size="xs"/></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Critical Events</div>
          <div class="text-h5 text-metric-mono text-red-5">14</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-purple-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Security Events</div>
          <div class="text-h5 text-metric-mono text-purple-4">2,301</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Pending Reviews</div>
          <div class="text-h5 text-metric-mono text-amber-5">12</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Open Investigations</div>
          <div class="text-h5 text-metric-mono text-indigo-4">4</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Audit Coverage</div>
          <div class="text-h5 text-metric-mono text-green-4">100%</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Queue Tabs & Command Bar Search -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-sm">
        <q-tabs v-model="activeWorkspaceTab" dense class="text-grey-5" active-color="amber-4" indicator-color="amber-4" align="left">
          <q-tab name="events" label="Audit Events" icon="format_list_bulleted" />
          <q-tab name="compliance" label="Compliance Monitoring" icon="policy" />
          <q-tab name="investigations" label="Active Investigations" icon="plagiarism" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="filter_list" color="grey-5" size="sm"><q-tooltip>Advanced Filters</q-tooltip></q-btn>
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search EVENT ID, USER, IP, REF..." class="text-caption" style="width: 280px;">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeWorkspaceTab" animated class="bg-transparent col" keep-alive>
        
        <!-- AUDIT EVENTS GRID PANEL -->
        <q-tab-panel name="events" class="q-pa-none column no-wrap">
          <div class="bg-subpanel border-bottom">
            <q-tabs v-model="activeCategoryTab" dense class="text-grey-5 font-mono text-caption" active-color="cyan-4" align="left" no-caps>
              <q-tab name="all" label="All Events" />
              <q-tab name="financial" label="Financial" />
              <q-tab name="security" label="Security" />
              <q-tab name="admin" label="Administrative" />
              <q-tab name="wallet" label="Wallet/Card" />
              <q-tab name="system" label="System" />
            </q-tabs>
          </div>
          
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="auditRecords"
            :columns="auditCols"
            row-key="id"
            dense
            virtual-scroll
            style="height: 100%;"
            selection="multiple"
            v-model:selected="selectedRecords"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-amber-3 cursor-pointer text-weight-bold hover-underline" @click="inspectAudit(props.row)">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-severity="props">
              <q-td :props="props">
                <q-badge :color="getSeverityColor(props.value)" text-color="dark" class="text-weight-bold">
                  {{ props.value }}
                </q-badge>
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

        <!-- COMPLIANCE MONITORING -->
        <q-tab-panel name="compliance" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Compliance Monitoring Dashboard</div>
          <div class="text-caption text-muted q-mb-md">AML, KYC, Suspicious Activity, and Sanctions Screening (Future-Ready UI Framework)</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted">
                <q-icon name="policy" size="xl" class="q-mb-md opacity-50" />
                <div>AML Monitoring Module Offline</div>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted">
                <q-icon name="person_search" size="xl" class="q-mb-md opacity-50" />
                <div>KYC/Sanctions Screening Offline</div>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted">
                <q-icon name="report" size="xl" class="q-mb-md opacity-50" />
                <div>Suspicious Activity Reporting Offline</div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- INVESTIGATIONS -->
        <q-tab-panel name="investigations" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Active Forensic Investigations</div>
          <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted">
            <q-icon name="plagiarism" size="xl" class="q-mb-md opacity-50" />
            <div>No Active Long-Term Investigations</div>
          </div>
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- AUDIT INSPECTION DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="900">
      <div v-if="selectedAudit" class="column full-height">
        
        <!-- Drawer Header & Action Center -->
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="grey-9" text-color="grey-4" label="AUDIT COMMAND" />
                <div class="text-h5 font-mono text-main">{{ selectedAudit.id }}</div>
                <q-badge :color="getSeverityColor(selectedAudit.severity)" text-color="dark">{{ selectedAudit.severity }}</q-badge>
              </div>
              <div class="text-caption text-muted font-mono">Timestamp: {{ selectedAudit.timestamp }} | Location: {{ selectedAudit.location }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- Governance Action Center -->
          <div class="row items-center op-gap-8 bg-dark q-pa-sm rounded-borders border-muted">
            <div class="text-caption font-mono text-muted q-mr-sm">ACTIONS:</div>
            <q-btn outline size="xs" color="cyan-4" icon="launch" label="Open Entity" />
            <q-btn outline size="xs" color="amber-4" icon="person_add" label="Assign Reviewer" />
            <q-btn outline size="xs" color="red-4" icon="gavel" label="Escalate Investigation" />
            <q-btn outline size="xs" color="orange-4" icon="flag" label="Flag Compliance Risk" />
            <q-btn outline size="xs" color="red-5" icon="block" label="Freeze Account" />
            <q-space />
            <q-btn outline size="xs" color="grey-6" icon="picture_as_pdf" label="Export Evidence" />
          </div>
        </div>

        <!-- Drawer Tabs -->
        <q-tabs v-model="drawerTab" dense class="text-grey-5 font-mono text-caption border-bottom" active-color="amber-4" align="left" no-caps>
          <q-tab name="overview" label="Overview" />
          <q-tab name="before_after" label="Before & After" />
          <q-tab name="timeline" label="Timeline" />
          <q-tab name="related" label="Related" />
          <q-tab name="entity" label="Entity History" />
          <q-tab name="user" label="User Activity" />
          <q-tab name="financial" label="Financial Impact" />
          <q-tab name="security" label="Security Analysis" />
          <q-tab name="compliance" label="Compliance" />
          <q-tab name="approvals" label="Approvals" />
          <q-tab name="evidence" label="Evidence" />
          <q-tab name="resolution" label="Resolution" />
          <q-tab name="risk" label="Risk Analysis" />
        </q-tabs>

        <q-scroll-area class="col">
          <q-tab-panels v-model="drawerTab" animated class="bg-transparent" keep-alive>
            
            <!-- OVERVIEW -->
            <q-tab-panel name="overview" class="q-pa-md column op-gap-16">
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Event Details</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Event Type:</span><span class="text-main">{{ selectedAudit.eventType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Category:</span><span class="text-cyan-4">{{ selectedAudit.category }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Entity Type:</span><span class="text-amber-4">{{ selectedAudit.entityType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Entity ID:</span><span class="text-main">{{ selectedAudit.entityId }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Correlation ID:</span><span class="text-grey-5">CORR-99412-A</span></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Actor & Source</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Actor:</span><span class="text-main">{{ selectedAudit.actor }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Role:</span><span class="text-indigo-4">{{ selectedAudit.role }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">IP Address:</span><span class="text-red-4">{{ selectedAudit.ip }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Device:</span><span class="text-main">{{ selectedAudit.device }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Session ID:</span><span class="text-grey-5">SESS-844B-12</span></div>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- BEFORE & AFTER (Diff) -->
            <q-tab-panel name="before_after" class="q-pa-md column">
              <div class="text-caption text-muted font-mono q-mb-sm">State Mutation Diff (JSON Representation)</div>
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-sm border-muted rounded-borders bg-dark font-mono text-caption text-red-3">
                    <div class="q-mb-xs text-muted border-bottom q-pb-xs">Original State (Before)</div>
                    <pre class="q-ma-none" style="white-space: pre-wrap;">{
  "status": "PENDING_APPROVAL",
  "dailyLimit": 500000,
  "requiresMFA": false
}</pre>
                  </div>
                </div>
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-sm border-muted rounded-borders bg-dark font-mono text-caption text-green-3">
                    <div class="q-mb-xs text-muted border-bottom q-pb-xs">Updated State (After)</div>
                    <pre class="q-ma-none" style="white-space: pre-wrap;">{
  "status": "APPROVED",
  "dailyLimit": 2500000,
  "requiresMFA": true
}</pre>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- SECURITY ANALYSIS -->
            <q-tab-panel name="security" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md">Security Vector Analysis</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">IP Address:</span><span class="text-red-4">{{ selectedAudit.ip }} (Flagged: Tor Exit Node)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Geo Location:</span><span class="text-main">{{ selectedAudit.location }}</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Device Fingerprint:</span><span class="text-main">FGRP-99X-A12 (New Device)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Failed Attempts:</span><span class="text-amber-4">3 prior attempts</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Session Risk:</span><span class="text-red-4">ELEVATED</span></div>
              </div>
            </q-tab-panel>

            <!-- RISK ANALYSIS -->
            <q-tab-panel name="risk" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row items-center op-gap-8 q-mb-md">
                  <q-circular-progress show-value class="text-caption text-white" :value="selectedAudit.riskScore" size="50px" :color="selectedAudit.riskScore > 80 ? 'red-5' : 'green-5'" track-color="dark" thickness="0.3">{{ selectedAudit.riskScore }}</q-circular-progress>
                  <div>
                    <div class="text-weight-bold">Governance Risk Assessment</div>
                    <div class="text-caption text-muted">AI Anomaly Score: {{ selectedAudit.anomalyScore }}</div>
                  </div>
                </div>
                <div class="text-caption text-muted border-bottom q-pb-xs q-mb-sm">Security & Fraud Flags Detected</div>
                <div class="row op-gap-8">
                  <q-badge color="red-10" text-color="red-3" v-for="flag in selectedAudit.securityFlags" :key="flag">{{ flag }}</q-badge>
                  <span v-if="!selectedAudit.securityFlags || selectedAudit.securityFlags.length === 0" class="text-green-4">None Detected</span>
                </div>
              </div>
            </q-tab-panel>

            <!-- FINANCIAL IMPACT -->
            <q-tab-panel name="financial" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md">Financial Impact Assessment</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Financial Effect:</span><span class="text-red-4 text-weight-bold">POTENTIAL LOSS</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Affected Amount:</span><span class="text-red-4">₦2,500,000</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Ledger Impact:</span><span class="text-main">None (Reverted)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Treasury Impact:</span><span class="text-main">None</span></div>
              </div>
            </q-tab-panel>

            <!-- RELATED RECORDS -->
            <q-tab-panel name="related" class="q-pa-md column">
              <div class="enterprise-subpanel border-muted rounded-borders font-mono text-caption">
                <q-list separator dark class="bg-transparent">
                  <q-item clickable v-ripple class="hover-bg" v-if="selectedAudit.entityType === 'SETTLEMENT'"><q-item-section avatar><q-badge color="indigo-10" text-color="indigo-3">SET</q-badge></q-item-section><q-item-section><q-item-label class="text-indigo-3">{{ selectedAudit.entityId }}</q-item-label><q-item-label caption>Settlement Batch</q-item-label></q-item-section></q-item>
                  <q-item clickable v-ripple class="hover-bg"><q-item-section avatar><q-badge color="blue-grey-10" text-color="blue-grey-3">USR</q-badge></q-item-section><q-item-section><q-item-label class="text-blue-grey-3">{{ selectedAudit.actor }}</q-item-label><q-item-label caption>Actor Profile</q-item-label></q-item-section></q-item>
                </q-list>
              </div>
            </q-tab-panel>

            <!-- PLACEHOLDERS FOR OTHERS -->
            <q-tab-panel name="timeline" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Chronological Reconstruction View</div></q-tab-panel>
            <q-tab-panel name="entity" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Full Entity Historical Trajectory</div></q-tab-panel>
            <q-tab-panel name="user" class="q-pa-md flex flex-center"><div class="text-muted font-mono">User Activity & Session History</div></q-tab-panel>
            <q-tab-panel name="compliance" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Regulatory & Compliance Review View</div></q-tab-panel>
            <q-tab-panel name="approvals" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Approval Chain View</div></q-tab-panel>
            <q-tab-panel name="evidence" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Attached Evidence & Logs View</div></q-tab-panel>
            <q-tab-panel name="resolution" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Resolution History View</div></q-tab-panel>

          </q-tab-panels>
        </q-scroll-area>
      </div>
    </q-drawer>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'

const activeWorkspaceTab = ref('events')
const activeCategoryTab = ref('all')
const searchQuery = ref('')
const selectedRecords = ref([])

const drawerOpen = ref(false)
const drawerTab = ref('overview')
const selectedAudit = ref(null)

const inspectAudit = (row) => {
  selectedAudit.value = row
  drawerOpen.value = true
  drawerTab.value = 'overview'
}

const getSeverityColor = (severity) => {
  const map = {
    'CRITICAL': 'red-4',
    'HIGH': 'orange-4',
    'MEDIUM': 'amber-4',
    'LOW': 'green-4',
    'INFO': 'cyan-4'
  }
  return map[severity] || 'grey-4'
}

// INVESTIGATION GRID DATA
const auditCols = [
  { name: 'id', label: 'AUDIT ID', field: 'id', align: 'left' },
  { name: 'eventType', label: 'EVENT TYPE', field: 'eventType', align: 'left' },
  { name: 'category', label: 'CATEGORY', field: 'category', align: 'left' },
  { name: 'severity', label: 'SEVERITY', field: 'severity', align: 'center' },
  { name: 'actor', label: 'ACTOR', field: 'actor', align: 'left' },
  { name: 'entityType', label: 'ENTITY', field: 'entityType', align: 'left' },
  { name: 'entityId', label: 'ENTITY ID', field: 'entityId', align: 'left' },
  { name: 'ip', label: 'SOURCE IP', field: 'ip', align: 'left' },
  { name: 'timestamp', label: 'TIMESTAMP', field: 'timestamp', align: 'right' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' }
]

const auditRecords = ref([
  {
    id: 'AUD-2026-990001',
    eventType: 'SETTLEMENT_APPROVAL_OVERRIDE',
    category: 'Settlement Events',
    severity: 'CRITICAL',
    actor: 'admin_sys_john',
    role: 'TREASURY_OFFICER',
    tenant: 'Global Services Ltd',
    tenantType: 'MERCHANT',
    entityType: 'SETTLEMENT',
    entityId: 'SET-20260531-0002',
    reference: 'STL/260531/0002',
    ip: '192.168.1.45',
    device: 'MacBook Pro / Chrome',
    location: 'Lagos, NG',
    status: 'FLAGGED',
    riskScore: 95,
    anomalyScore: 0.98,
    fraudFlags: [],
    securityFlags: ['UNUSUAL_GEO', 'TOR_NODE_SUSPECTED'],
    complianceFlags: ['POLICY_OVERRIDE'],
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'AUD-2026-990002',
    eventType: 'WALLET_LIMIT_INCREASE',
    category: 'Wallet Events',
    severity: 'HIGH',
    actor: 'support_mary',
    role: 'SUPPORT_LEAD',
    tenant: 'Ahmadu Bello University',
    tenantType: 'SCHOOL',
    entityType: 'WALLET',
    entityId: 'WAL-SCH-0001',
    reference: 'TKT-88412',
    ip: '10.0.0.12',
    device: 'Windows 11 / Edge',
    location: 'Abuja, NG',
    status: 'RESOLVED',
    riskScore: 60,
    anomalyScore: 0.45,
    fraudFlags: [],
    securityFlags: [],
    complianceFlags: [],
    timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'AUD-2026-990003',
    eventType: 'USER_LOGIN_SUCCESS',
    category: 'Authentication Events',
    severity: 'INFO',
    actor: 'admin_sys_john',
    role: 'TREASURY_OFFICER',
    tenant: 'SYSTEM',
    tenantType: 'INTERNAL',
    entityType: 'USER',
    entityId: 'USR-841',
    reference: 'AUTH-OK',
    ip: '192.168.1.45',
    device: 'MacBook Pro / Chrome',
    location: 'Lagos, NG',
    status: 'SUCCESS',
    riskScore: 10,
    anomalyScore: 0.02,
    fraudFlags: [],
    securityFlags: [],
    complianceFlags: [],
    timestamp: new Date(Date.now() - 86400000).toISOString()
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
