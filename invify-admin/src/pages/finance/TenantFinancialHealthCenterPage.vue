<!-- invify-admin/src/pages/finance/TenantFinancialHealthCenterPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Tenant Intelligence Center -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Business Intelligence Engine</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Tenant Financial Health Center
          </div>
        </div>

        <!-- Tenant Intelligence Subpanel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 20px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Top Revenue Tenant:</span>
            <span class="text-green-4 text-weight-bold text-subtitle2">Shoprite Mega Store</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Fastest Growing:</span>
            <q-badge color="green-10" text-color="green-3"><q-icon name="trending_up" size="xs" class="q-mr-xs"/>Invify Agency Network</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Highest Risk:</span>
            <span class="text-red-4 text-weight-bold">BetKing (Compliance Watchlist)</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Top School:</span>
            <span class="text-cyan-4 text-weight-bold">Ahmadu Bello University</span>
          </div>
          <q-icon name="apartment" color="green-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh Analytics" class="text-caption text-weight-bold" />
        <q-btn outline size="xs" color="cyan-4" icon="people" label="Assign RM" class="text-caption text-weight-bold" />
        <q-btn-dropdown size="xs" color="indigo-4" icon="assessment" label="Tenant Reports" class="text-caption text-weight-bold text-white" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Top Revenue List</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>High Churn Risk Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Compliance Watchlist</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- Tenant KPI Dashboard -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Total / Active Tenants</div>
          <div class="text-h5 text-metric-mono text-cyan-4">842 / 815</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Avg Tenant Revenue</div>
          <div class="text-h5 text-metric-mono text-green-4">{{ currentCurrency.symbol }}1.4M <span class="text-caption text-muted">(+8%)</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Settlement Success / Compliance</div>
          <div class="text-h5 text-metric-mono text-indigo-4">99.8% / 96%</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">High Growth / Rev Generating</div>
          <div class="text-h5 text-metric-mono text-amber-5">142 / 680</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">High Risk / Churn Risk</div>
          <div class="text-h5 text-metric-mono text-red-5">12 / 24</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-purple-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Avg Tenant Growth</div>
          <div class="text-h5 text-metric-mono text-purple-4">+14.2%</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Queue Tabs & Command Bar Search -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-sm">
        <q-tabs v-model="activeWorkspaceTab" dense class="text-grey-5" active-color="amber-4" indicator-color="amber-4" align="left">
          <q-tab name="directory" label="Tenant Health Directory" icon="domain" />
          <q-tab name="portfolio" label="Relationship Portfolio" icon="people" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="filter_list" color="grey-5" size="sm"><q-tooltip>Advanced Filters</q-tooltip></q-btn>
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search TENANT ID, NAME, SECTOR..." class="text-caption" style="width: 280px;">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeWorkspaceTab" animated class="bg-transparent col" keep-alive>
        
        <!-- TENANT DIRECTORY GRID PANEL -->
        <q-tab-panel name="directory" class="q-pa-none column no-wrap">
          <div class="bg-subpanel border-bottom scroll-x">
            <q-tabs v-model="activeCategoryTab" dense class="text-grey-5 font-mono text-caption" active-color="cyan-4" align="left" no-caps>
              <q-tab name="all" label="All Tenants" />
              <q-tab name="schools" label="Schools" />
              <q-tab name="retail" label="Retail" />
              <q-tab name="services" label="Services" />
              <q-tab name="agents" label="Agents" />
              <q-tab name="institutions" label="Institutions" />
              <q-separator vertical class="q-mx-sm bg-dark" />
              <q-tab name="highgrowth" label="High Growth" />
              <q-tab name="highrisk" label="High Risk" />
              <q-tab name="dormant" label="Dormant" />
              <q-tab name="toprevenue" label="Top Revenue" />
              <q-tab name="watchlist" label="Compliance Watchlist" />
            </q-tabs>
          </div>
          
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="tenantRecords"
            :columns="tenantCols"
            row-key="id"
            dense
            virtual-scroll
            style="height: 100%;"
            selection="multiple"
            v-model:selected="selectedRecords"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-amber-3 cursor-pointer text-weight-bold hover-underline" @click="inspectTenant(props.row)">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-tenantName="props">
              <q-td :props="props" class="font-mono text-cyan-3 text-weight-bold">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-revenue="props">
              <q-td :props="props" class="font-mono text-right text-green-4 text-weight-bold">
                {{ currentCurrency.symbol }}{{ props.value.toLocaleString() }}
              </q-td>
            </template>
            <template v-slot:body-cell-growthScore="props">
              <q-td :props="props" class="font-mono text-right" :class="props.value > 0 ? 'text-green-4' : 'text-red-4'">
                <q-icon :name="props.value > 0 ? 'trending_up' : 'trending_down'" size="xs" />
                {{ props.value }}%
              </q-td>
            </template>
            <template v-slot:body-cell-healthScore="props">
              <q-td :props="props" class="font-mono text-center">
                <q-badge :color="props.value > 85 ? 'green-10' : (props.value > 60 ? 'amber-10' : 'red-10')" :text-color="props.value > 85 ? 'green-3' : (props.value > 60 ? 'amber-3' : 'red-3')" class="text-weight-bold">
                  {{ props.value }}%
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

        <!-- RELATIONSHIP PORTFOLIO -->
        <q-tab-panel name="portfolio" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Relationship Management Portfolio</div>
          <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted">
            <q-icon name="people" size="xl" class="q-mb-md opacity-50" />
            <div>Portfolio mapping loaded. No pending relationship escalations.</div>
          </div>
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- TENANT INSPECTION DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="950">
      <div v-if="selectedTenant" class="column full-height">
        
        <!-- Drawer Header & Action Center -->
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="indigo-10" text-color="indigo-3" label="TENANT COMMAND" />
                <div class="text-h5 font-mono text-main">{{ selectedTenant.tenantName }}</div>
                <q-badge :color="selectedTenant.healthScore > 85 ? 'green-10' : 'amber-10'" :text-color="selectedTenant.healthScore > 85 ? 'green-3' : 'amber-3'">{{ selectedTenant.status }}</q-badge>
              </div>
              <div class="text-caption text-muted font-mono">Tenant ID: {{ selectedTenant.id }} | Sector: {{ selectedTenant.tenantType }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- Operational Action Center -->
          <div class="row items-center op-gap-8 bg-dark q-pa-sm rounded-borders border-muted">
            <div class="text-caption font-mono text-muted q-mr-sm">ACTIONS:</div>
            <q-btn outline size="xs" color="cyan-4" icon="people" label="Assign RM" />
            <q-btn outline size="xs" color="amber-4" icon="flag" label="Flag Risk" />
            <q-btn outline size="xs" color="purple-4" icon="event" label="Schedule Review" />
            <q-space />
            <q-btn outline size="xs" color="grey-6" icon="assessment" label="Generate Report" />
            <q-btn outline size="xs" color="grey-6" icon="gavel" label="Escalate" />
            <q-btn outline size="xs" color="grey-6" icon="download" label="Export Data" />
          </div>
        </div>

        <!-- Drawer Tabs -->
        <q-tabs v-model="drawerTab" dense class="text-grey-5 font-mono text-caption border-bottom scroll-x" active-color="amber-4" align="left" no-caps>
          <q-tab name="overview" label="Overview" />
          <q-tab name="financial" label="Financial Perf" />
          <q-tab name="revenue" label="Revenue Sources" />
          <q-tab name="wallets" label="Wallet Ecosystem" />
          <q-tab name="cards" label="Card Ecosystem" />
          <q-tab name="terminals" label="Terminal Ecosystem" />
          <q-tab name="settlements" label="Settlement Perf" />
          <q-tab name="risk" label="Risk Analysis" />
          <q-tab name="compliance" label="Compliance" />
          <q-tab name="forecasting" label="Forecasting" />
          <q-tab name="audit" label="Audit Trail" />
          <q-tab name="timeline" label="Timeline" />
          <q-tab name="related" label="Related Records" />
          <q-tab name="resolution" label="Support History" />
        </q-tabs>

        <q-scroll-area class="col">
          <q-tab-panels v-model="drawerTab" animated class="bg-transparent" keep-alive>
            
            <!-- OVERVIEW -->
            <q-tab-panel name="overview" class="q-pa-md column op-gap-16">
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Tenant Intelligence Profile</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant Sector:</span><span class="text-cyan-4">{{ selectedTenant.tenantType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Relationship Mgr:</span><span class="text-main">{{ selectedTenant.relationshipManager || 'Unassigned' }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Created Date:</span><span class="text-main">{{ selectedTenant.createdDate }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Ecosystem Size:</span><span class="text-amber-4">{{ selectedTenant.walletCount }} W / {{ selectedTenant.terminalCount }} T / {{ selectedTenant.cardCount }} C</span></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height bg-dark">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">AI Health Engine Scores</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Global Health Score:</span><span class="text-green-4 text-weight-bold">{{ selectedTenant.healthScore }}%</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Growth Score:</span><span class="text-cyan-4">+{{ selectedTenant.growthScore }}%</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Compliance Score:</span><span class="text-main">{{ selectedTenant.complianceScore }}%</span></div>
                    <div class="row justify-between q-mt-sm border-top q-pt-sm font-mono"><span class="text-muted">Churn Risk Prediction:</span><span :class="selectedTenant.churnScore > 40 ? 'text-red-4' : 'text-indigo-4'">{{ selectedTenant.churnScore }}% ({{ selectedTenant.churnScore > 40 ? 'HIGH' : 'LOW' }})</span></div>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- FINANCIAL PERFORMANCE -->
            <q-tab-panel name="financial" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md text-green-4">Financial & Profitability Metrics</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Gross Revenue Generated:</span><span class="text-main">{{ currentCurrency.symbol }}{{ selectedTenant.revenue.toLocaleString() }}</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Platform Cost / Support Cost:</span><span class="text-red-4">{{ currentCurrency.symbol }}{{ (selectedTenant.revenue * 0.15).toLocaleString() }}</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Net Profitability:</span><span class="text-green-4 text-weight-bold">{{ currentCurrency.symbol }}{{ (selectedTenant.revenue * 0.85).toLocaleString() }}</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Margin:</span><span class="text-cyan-4">85%</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Transaction Volume (Period):</span><span class="text-main">{{ selectedTenant.txnVolume.toLocaleString() }}</span></div>
              </div>
            </q-tab-panel>

            <!-- RISK ANALYSIS -->
            <q-tab-panel name="risk" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row items-center op-gap-8 q-mb-md">
                  <q-circular-progress show-value class="text-caption text-white" :value="selectedTenant.riskScore" size="50px" :color="selectedTenant.riskScore > 80 ? 'red-5' : 'green-5'" track-color="dark" thickness="0.3">{{ selectedTenant.riskScore }}</q-circular-progress>
                  <div>
                    <div class="text-weight-bold">Tenant Risk & Churn Assessment</div>
                    <div class="text-caption text-muted">AI Anomaly Score: {{ selectedTenant.anomalyScore }}</div>
                    <div class="text-caption text-indigo-3">Fraud Exposure: {{ selectedTenant.fraudExposure }}</div>
                  </div>
                </div>
                <div class="text-caption text-muted border-bottom q-pb-xs q-mb-sm">Risk Vectors & Analysis</div>
                <div class="row justify-between q-mb-xs"><span class="text-muted">Settlement Risk:</span><span class="text-green-4">LOW (99.8% Success)</span></div>
                <div class="row justify-between q-mb-xs"><span class="text-muted">Operational Risk:</span><span class="text-green-4">LOW</span></div>
                <div class="row justify-between q-mb-xs"><span class="text-muted">Revenue Concentration Risk:</span><span class="text-amber-4">MEDIUM</span></div>
                <div class="q-mt-sm text-caption text-muted border-top q-pt-sm">AI Recommendation: {{ selectedTenant.recommendedAction }}</div>
              </div>
            </q-tab-panel>

            <!-- COMPLIANCE -->
            <q-tab-panel name="compliance" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row justify-between q-mb-md">
                  <div class="text-weight-bold text-main">Regulatory & Compliance Profile</div>
                  <q-circular-progress show-value class="text-caption text-white" :value="selectedTenant.complianceScore" size="30px" color="cyan-5" track-color="dark" thickness="0.3">{{ selectedTenant.complianceScore }}</q-circular-progress>
                </div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">KYC Status:</span><span class="text-green-4">VERIFIED (TIER 3)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">AML Status:</span><span class="text-green-4">CLEARED</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Sanctions Status:</span><span class="text-green-4">CLEARED</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Open Compliance Issues:</span><span class="text-main">0</span></div>
              </div>
            </q-tab-panel>

            <!-- FORECASTING (AI Hooks) -->
            <q-tab-panel name="forecasting" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md text-purple-3"><q-icon name="auto_graph" class="q-mr-xs" /> Predictive Tenant Analytics</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Projected Revenue (Next Quarter):</span><span class="text-main">{{ currentCurrency.symbol }}{{ (selectedTenant.revenue * 1.15).toLocaleString() }}</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Growth Forecast:</span><span class="text-green-4">+15.0%</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Churn Prediction:</span><span class="text-main">Extremely Low</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Seasonality Impact:</span><span class="text-amber-4">HIGH</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Confidence Score:</span><span class="text-indigo-3">{{ selectedTenant.forecastScore }}%</span></div>
              </div>
            </q-tab-panel>

            <!-- PLACEHOLDERS FOR OTHERS -->
            <q-tab-panel name="revenue" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Revenue Source Breakdown View</div></q-tab-panel>
            <q-tab-panel name="wallets" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Wallet Ecosystem & Float View</div></q-tab-panel>
            <q-tab-panel name="cards" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Card Ecosystem & Spend View</div></q-tab-panel>
            <q-tab-panel name="terminals" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Terminal Fleet & Hardware View</div></q-tab-panel>
            <q-tab-panel name="settlements" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Settlement Success & Queue View</div></q-tab-panel>
            <q-tab-panel name="audit" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Tenant Administrative Audit Trail</div></q-tab-panel>
            <q-tab-panel name="timeline" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Chronological Tenant History</div></q-tab-panel>
            <q-tab-panel name="related" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Related Operational Records View</div></q-tab-panel>
            <q-tab-panel name="resolution" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Support & Resolution History</div></q-tab-panel>

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
const activeCategoryTab = ref('all')
const searchQuery = ref('')
const selectedRecords = ref([])

const drawerOpen = ref(false)
const drawerTab = ref('overview')
const selectedTenant = ref(null)

const inspectTenant = (row) => {
  selectedTenant.value = row
  drawerOpen.value = true
  drawerTab.value = 'overview'
}

// INVESTIGATION GRID DATA
const tenantCols = [
  { name: 'id', label: 'TENANT ID', field: 'id', align: 'left' },
  { name: 'tenantName', label: 'TENANT NAME', field: 'tenantName', align: 'left' },
  { name: 'tenantType', label: 'SECTOR', field: 'tenantType', align: 'left' },
  { name: 'healthScore', label: 'HEALTH', field: 'healthScore', align: 'center' },
  { name: 'growthScore', label: 'GROWTH', field: 'growthScore', align: 'right' },
  { name: 'revenue', label: 'REVENUE (₦)', field: 'revenue', align: 'right' },
  { name: 'walletCount', label: 'WALLETS', field: 'walletCount', align: 'right' },
  { name: 'terminalCount', label: 'TERMS', field: 'terminalCount', align: 'right' },
  { name: 'cardCount', label: 'CARDS', field: 'cardCount', align: 'right' },
  { name: 'complianceScore', label: 'COMPLIANCE', field: 'complianceScore', align: 'center' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' }
]

const tenantRecords = ref([
  {
    id: 'TEN-SCH-001',
    tenantName: 'Ahmadu Bello University',
    tenantType: 'SCHOOL',
    healthScore: 98,
    growthScore: 14.5,
    revenue: 45000000,
    txnVolume: 1250000,
    walletCount: 84000,
    terminalCount: 42,
    cardCount: 22000,
    complianceScore: 100,
    riskScore: 2,
    churnScore: 1,
    anomalyScore: 0.01,
    fraudExposure: 'LOW',
    status: 'ACTIVE',
    relationshipManager: 'Dr. S. Okonkwo',
    createdDate: '2025-01-15',
    recommendedAction: 'Offer premium treasury services',
    forecastScore: 92,
    predictionStatus: 'STABLE_GROWTH'
  },
  {
    id: 'TEN-MER-042',
    tenantName: 'Shoprite Mega Store',
    tenantType: 'RETAIL',
    healthScore: 95,
    growthScore: 8.2,
    revenue: 125000000,
    txnVolume: 3500000,
    walletCount: 1,
    terminalCount: 240,
    cardCount: 0,
    complianceScore: 98,
    riskScore: 14,
    churnScore: 5,
    anomalyScore: 0.05,
    fraudExposure: 'MEDIUM (Card Testing)',
    status: 'ACTIVE',
    relationshipManager: 'A. Bello',
    createdDate: '2024-11-20',
    recommendedAction: 'Monitor terminal offline rates',
    forecastScore: 88,
    predictionStatus: 'STABLE'
  },
  {
    id: 'TEN-AGT-881',
    tenantName: 'Invify Agency Network',
    tenantType: 'AGENT',
    healthScore: 82,
    growthScore: 42.1,
    revenue: 18500000,
    txnVolume: 890000,
    walletCount: 1400,
    terminalCount: 1200,
    cardCount: 1400,
    complianceScore: 85,
    riskScore: 45,
    churnScore: 22,
    anomalyScore: 0.45,
    fraudExposure: 'HIGH (Velocity)',
    status: 'ACTIVE',
    relationshipManager: 'Unassigned',
    createdDate: '2025-06-10',
    recommendedAction: 'Deploy advanced fraud rules; KYC audit',
    forecastScore: 74,
    predictionStatus: 'HIGH_VOLATILITY'
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
