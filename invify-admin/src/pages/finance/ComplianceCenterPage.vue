<!-- invify-admin/src/pages/finance/ComplianceCenterPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Compliance Intelligence Center -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Regulatory & Governance Engine</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Compliance Center
          </div>
        </div>

        <!-- Compliance Intelligence Subpanel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 20px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Top AML Alert:</span>
            <span class="text-red-4 text-weight-bold text-subtitle2">Velocity Spike (Agent Network)</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Compliance Trend:</span>
            <q-badge color="green-10" text-color="green-3"><q-icon name="trending_up" size="xs" class="q-mr-xs"/>96% Stable</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Highest Risk Tenant:</span>
            <span class="text-amber-4 text-weight-bold">BetKing (RETAIL)</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Regulatory Exposure:</span>
            <span class="text-cyan-4 text-weight-bold">LOW</span>
          </div>
          <q-icon name="policy" color="cyan-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh Pipeline" class="text-caption text-weight-bold" />
        <q-btn outline size="xs" color="red-4" icon="gavel" label="Create SAR" class="text-caption text-weight-bold" />
        <q-btn-dropdown size="xs" color="indigo-4" icon="assessment" label="Regulatory Reports" class="text-caption text-weight-bold text-white" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>AML Coverage Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>KYC Completion Audit</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Sanctions Matches (Monthly)</q-item-section></q-item>
            <q-separator dark />
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>SAR Submissions</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Regulatory Exceptions</q-item-section></q-item>
            <q-separator dark />
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>PEP Screening Log</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- Compliance KPI Dashboard -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Global Compliance / KYC</div>
          <div class="text-h5 text-metric-mono text-cyan-4">96.4% / 98.1%</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Pending Reviews / Cases</div>
          <div class="text-h5 text-metric-mono text-amber-4">142 / 34</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">High Risk Entities</div>
          <div class="text-h5 text-metric-mono text-red-5">12</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-purple-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">PEP Matches / Sanctions</div>
          <div class="text-h5 text-metric-mono text-purple-4">4 / 0</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">SARs / Exceptions</div>
          <div class="text-h5 text-metric-mono text-indigo-4">2 / 8</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">AML Coverage / Sanctions</div>
          <div class="text-h5 text-metric-mono text-green-4">100% / 100%</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Queue Tabs & Command Bar Search -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-sm">
        <q-tabs v-model="activeWorkspaceTab" dense class="text-grey-5" active-color="amber-4" indicator-color="amber-4" align="left">
          <q-tab name="investigation" label="Compliance Pipeline" icon="policy" />
          <q-tab name="watchlists" label="Watchlists & Sanctions" icon="visibility" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="filter_list" color="grey-5" size="sm"><q-tooltip>Advanced Filters</q-tooltip></q-btn>
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search CASE ID, ENTITY, TYPE..." class="text-caption" style="width: 280px;">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeWorkspaceTab" animated class="bg-transparent col" keep-alive>
        
        <!-- COMPLIANCE PIPELINE GRID PANEL -->
        <q-tab-panel name="investigation" class="q-pa-none column no-wrap">
          <div class="bg-subpanel border-bottom scroll-x">
            <q-tabs v-model="activeCategoryTab" dense class="text-grey-5 font-mono text-caption" active-color="cyan-4" align="left" no-caps>
              <q-tab name="kyc" label="KYC" />
              <q-tab name="aml" label="AML" />
              <q-tab name="sanctions" label="Sanctions" />
              <q-tab name="pep" label="PEP Screening" />
              <q-tab name="highvalue" label="High Value Txns" />
              <q-tab name="suspicious" label="Suspicious Activity" />
              <q-tab name="violations" label="Regulatory Violations" />
              <q-separator vertical class="q-mx-sm bg-dark" />
              <q-tab name="exceptions" label="Exceptions" />
              <q-tab name="pending" label="Pending Reviews" />
              <q-tab name="resolved" label="Resolved Cases" />
            </q-tabs>
          </div>
          
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="complianceRecords"
            :columns="complianceCols"
            row-key="id"
            dense
            virtual-scroll
            style="height: 100%;"
            selection="multiple"
            v-model:selected="selectedRecords"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-amber-3 cursor-pointer text-weight-bold hover-underline" @click="inspectCase(props.row)">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-entityType="props">
              <q-td :props="props" class="font-mono text-cyan-3">
                <q-icon :name="props.value === 'TENANT' ? 'apartment' : (props.value === 'WALLET' ? 'account_balance_wallet' : 'person')" size="xs" class="q-mr-xs opacity-50" />
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="props.value === 'PENDING' ? 'amber-10' : (props.value === 'ESCALATED' ? 'red-10' : 'green-10')" :text-color="props.value === 'PENDING' ? 'amber-3' : (props.value === 'ESCALATED' ? 'red-3' : 'green-3')" class="text-weight-bold">
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
            <template v-slot:body-cell-complianceScore="props">
              <q-td :props="props" class="font-mono text-center">
                <q-badge :color="props.value > 85 ? 'green-10' : (props.value > 60 ? 'amber-10' : 'red-10')" :text-color="props.value > 85 ? 'green-3' : (props.value > 60 ? 'amber-3' : 'red-3')">
                  {{ props.value }}%
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- WATCHLISTS -->
        <q-tab-panel name="watchlists" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Sanctions & Watchlist Coverage</div>
          <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted">
            <q-icon name="visibility" size="xl" class="q-mb-md text-cyan-4" />
            <div class="text-cyan-4 text-weight-bold">100% OFAC, UN, EU Lists Sycned</div>
            <div class="text-caption q-mt-xs">Last sync 5 mins ago. 0 Active Matches. 4 PEP Alerts Investigating.</div>
          </div>
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- COMPLIANCE INSPECTION DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="950">
      <div v-if="selectedCase" class="column full-height">
        
        <!-- Drawer Header & Action Center -->
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="cyan-10" text-color="cyan-3" label="COMPLIANCE COMMAND" />
                <div class="text-h5 font-mono text-main">{{ selectedCase.id }}</div>
                <q-badge :color="selectedCase.status === 'PENDING' ? 'amber-10' : (selectedCase.status === 'ESCALATED' ? 'red-10' : 'green-10')" :text-color="selectedCase.status === 'PENDING' ? 'amber-3' : (selectedCase.status === 'ESCALATED' ? 'red-3' : 'green-3')">{{ selectedCase.status }}</q-badge>
              </div>
              <div class="text-caption text-muted font-mono">Type: {{ selectedCase.complianceType }} | Entity: {{ selectedCase.entityId }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- Operational Action Center -->
          <div class="row items-center op-gap-8 bg-dark q-pa-sm rounded-borders border-muted">
            <div class="text-caption font-mono text-muted q-mr-sm">ACTIONS:</div>
            <q-btn outline size="xs" color="green-4" icon="check_circle" label="Approve KYC" v-if="selectedCase.complianceType === 'KYC'" />
            <q-btn outline size="xs" color="amber-4" icon="contact_mail" label="Request Docs" v-if="selectedCase.complianceType === 'KYC'" />
            <q-btn outline size="xs" color="red-4" icon="gavel" label="Create SAR" />
            <q-btn outline size="xs" color="red-4" icon="block" label="Freeze Entity" />
            <q-space />
            <q-btn outline size="xs" color="grey-6" icon="person_add" label="Assign Officer" />
            <q-btn outline size="xs" color="grey-6" icon="warning" label="Escalate" />
            <q-btn outline size="xs" color="grey-6" icon="assessment" label="Generate Report" />
          </div>
        </div>

        <!-- Drawer Tabs -->
        <q-tabs v-model="drawerTab" dense class="text-grey-5 font-mono text-caption border-bottom scroll-x" active-color="amber-4" align="left" no-caps>
          <q-tab name="overview" label="Overview" />
          <q-tab name="kyc" label="KYC Review" />
          <q-tab name="aml" label="AML Review" />
          <q-tab name="sanctions" label="Sanctions Review" />
          <q-tab name="pep" label="PEP Screening" />
          <q-tab name="transactions" label="Txn Analysis" />
          <q-tab name="risk" label="Risk Analysis" />
          <q-tab name="regulatory" label="Regulatory Review" />
          <q-tab name="audit" label="Audit Trail" />
          <q-tab name="timeline" label="Timeline" />
          <q-tab name="related" label="Related Records" />
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
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Case Details</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Compliance Type:</span><span class="text-cyan-4">{{ selectedCase.complianceType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Entity Type:</span><span class="text-main">{{ selectedCase.entityType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant:</span><span class="text-main">{{ selectedCase.tenant }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Assigned Officer:</span><span class="text-main">{{ selectedCase.officer }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Created Date:</span><span class="text-main">{{ selectedCase.createdDate }}</span></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height bg-dark">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Compliance Engine Scoring</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Overall Risk Score:</span><span :class="selectedCase.riskScore > 60 ? 'text-red-4' : 'text-green-4'">{{ selectedCase.riskScore }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Compliance Score:</span><span :class="selectedCase.complianceScore > 85 ? 'text-green-4' : 'text-amber-4'">{{ selectedCase.complianceScore }}%</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">AML Score:</span><span class="text-green-4">{{ selectedCase.amlScore }}%</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">KYC Score:</span><span class="text-amber-4">{{ selectedCase.kycScore }}%</span></div>
                    <div class="row justify-between q-mt-sm border-top q-pt-sm font-mono"><span class="text-muted">AI Prediction Status:</span><span class="text-indigo-4">{{ selectedCase.predictionStatus }}</span></div>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- KYC REVIEW -->
            <q-tab-panel name="kyc" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row justify-between q-mb-md">
                  <div class="text-weight-bold text-main">Know Your Customer (KYC) Review</div>
                  <q-badge color="amber-10" text-color="amber-3">PENDING MANUAL REVIEW</q-badge>
                </div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Verification Tier:</span><span class="text-main">TIER 3 (Corporate)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Identity Status:</span><span class="text-green-4">VERIFIED (NIN Match)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Business Document Status:</span><span class="text-amber-4">CAC DOCS SUBMITTED - UNVERIFIED</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Liveness Check:</span><span class="text-green-4">PASSED</span></div>
                <div class="q-mt-md text-caption text-muted border-top q-pt-sm">Note: Officer requires review of newly submitted CAC corporate filing before approval.</div>
              </div>
            </q-tab-panel>

            <!-- AML REVIEW -->
            <q-tab-panel name="aml" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md text-cyan-3">Anti-Money Laundering (AML) Monitor</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Transaction Monitoring:</span><span class="text-green-4">NORMAL ACTIVITY</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Velocity Analysis:</span><span class="text-amber-4">ELEVATED (Alert CMP-2026-941)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Suspicious Pattern Match:</span><span class="text-green-4">NONE</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Counterparty Risk:</span><span class="text-green-4">LOW</span></div>
              </div>
            </q-tab-panel>

            <!-- DOCUMENTS -->
            <q-tab-panel name="documents" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md">Evidence & Regulatory Documents</div>
                <q-list separator dark class="bg-transparent border-muted rounded-borders">
                  <q-item>
                    <q-item-section avatar><q-icon name="description" color="cyan-4" /></q-item-section>
                    <q-item-section>
                      <q-item-label class="text-main">CAC_Certificate_Incorporation.pdf</q-item-label>
                      <q-item-label caption>Submitted 2 days ago</q-item-label>
                    </q-item-section>
                    <q-item-section side><q-btn flat dense icon="download" size="sm" color="cyan-4"/></q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section avatar><q-icon name="person" color="amber-4" /></q-item-section>
                    <q-item-section>
                      <q-item-label class="text-main">Director_ID_Passport.jpg</q-item-label>
                      <q-item-label caption>Verified via API</q-item-label>
                    </q-item-section>
                    <q-item-section side><q-btn flat dense icon="visibility" size="sm" color="amber-4"/></q-item-section>
                  </q-item>
                </q-list>
              </div>
            </q-tab-panel>

            <!-- PLACEHOLDERS FOR OTHERS -->
            <q-tab-panel name="sanctions" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Sanctions Screening & Watchlist Match View</div></q-tab-panel>
            <q-tab-panel name="pep" class="q-pa-md flex flex-center"><div class="text-muted font-mono">PEP (Politically Exposed Person) Match View</div></q-tab-panel>
            <q-tab-panel name="transactions" class="q-pa-md flex flex-center"><div class="text-muted font-mono">High Value Transaction Audit View</div></q-tab-panel>
            <q-tab-panel name="risk" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Comprehensive Risk & Reputation Analysis</div></q-tab-panel>
            <q-tab-panel name="regulatory" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Regulatory Frameworks & Violations View</div></q-tab-panel>
            <q-tab-panel name="audit" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Compliance Event Audit Trail</div></q-tab-panel>
            <q-tab-panel name="timeline" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Chronological Compliance History</div></q-tab-panel>
            <q-tab-panel name="related" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Related Operational Records View</div></q-tab-panel>
            <q-tab-panel name="resolution" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Findings & Corrective Action History</div></q-tab-panel>

          </q-tab-panels>
        </q-scroll-area>
      </div>
    </q-drawer>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'

const activeWorkspaceTab = ref('investigation')
const activeCategoryTab = ref('kyc')
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

// INVESTIGATION GRID DATA
const complianceCols = [
  { name: 'id', label: 'CASE ID', field: 'id', align: 'left' },
  { name: 'complianceType', label: 'TYPE', field: 'complianceType', align: 'left' },
  { name: 'entityType', label: 'ENTITY', field: 'entityType', align: 'left' },
  { name: 'tenant', label: 'TENANT / SCOPE', field: 'tenant', align: 'left' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'complianceScore', label: 'COMPLIANCE', field: 'complianceScore', align: 'center' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' },
  { name: 'officer', label: 'OFFICER', field: 'officer', align: 'left' },
  { name: 'createdDate', label: 'CREATED', field: 'createdDate', align: 'right' }
]

const complianceRecords = ref([
  {
    id: 'CMP-2026-941',
    complianceType: 'AML_ALERT',
    entityType: 'TENANT',
    entityId: 'TEN-AGT-881',
    tenant: 'Invify Agency Network',
    tenantType: 'AGENT',
    status: 'ESCALATED',
    complianceScore: 85,
    amlScore: 65,
    kycScore: 100,
    riskScore: 78,
    officer: 'F. Compliance',
    createdDate: '2026-05-30',
    predictionStatus: 'REVIEW_REQUIRED',
    recommendedAction: 'Analyze velocity spikes on Terminal TRM-AGT-0012'
  },
  {
    id: 'CMP-2026-942',
    complianceType: 'KYC',
    entityType: 'TENANT',
    entityId: 'TEN-MER-112',
    tenant: 'FastFood Central',
    tenantType: 'RETAIL',
    status: 'PENDING',
    complianceScore: 60,
    amlScore: 100,
    kycScore: 40,
    riskScore: 35,
    officer: 'Unassigned',
    createdDate: '2026-05-31',
    predictionStatus: 'AWAITING_DOCS',
    recommendedAction: 'Review submitted CAC documents'
  },
  {
    id: 'CMP-2026-943',
    complianceType: 'PEP_SCREENING',
    entityType: 'USER',
    entityId: 'USR-8812',
    tenant: 'Invify Core Platform',
    tenantType: 'PLATFORM',
    status: 'PENDING',
    complianceScore: 92,
    amlScore: 95,
    kycScore: 100,
    riskScore: 45,
    officer: 'E. Risk',
    createdDate: '2026-05-30',
    predictionStatus: 'FALSE_POSITIVE_LIKELY',
    recommendedAction: 'Verify date of birth mismatch'
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
