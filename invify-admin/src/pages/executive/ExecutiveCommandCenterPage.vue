<!-- invify-admin/src/pages/executive/ExecutiveCommandCenterPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Executive Intelligence Center -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted text-uppercase tracking-wider">Strategic Command Center</div>
          <div class="text-h4 text-main text-weight-bolder" style="line-height: 1.1;">
            Executive Overview
          </div>
        </div>

        <!-- Executive Intelligence Subpanel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 30px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Global Platform Health:</span>
            <q-badge color="green-10" text-color="green-3" class="text-subtitle2"><q-icon name="monitor_heart" size="xs" class="q-mr-xs"/>98.4%</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Top Revenue:</span>
            <span class="text-green-4 text-weight-bold">Shoprite Mega Store</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Highest Risk:</span>
            <span class="text-red-4 text-weight-bold">BetKing (Compliance)</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">AI Treasury Forecast:</span>
            <span class="text-cyan-4 text-weight-bold">+12% Liquidity Demand</span>
          </div>
          <q-icon name="dashboard_customize" color="indigo-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="sm" color="amber-4" icon="present_to_all" label="Board View" @click="toggleBoardView" class="text-weight-bold" />
        <q-btn-dropdown outline size="sm" color="indigo-4" icon="assessment" label="Executive Reports" class="text-weight-bold text-white">
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Generate Board Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Export Executive Dashboard</q-item-section></q-item>
            <q-separator dark />
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Revenue Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Treasury Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Compliance Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Tenant Performance Report</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
        <!-- Notification Engine Metrics -->
        <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-md col-12 col-md-3">
          <div class="row items-center justify-between q-mb-xs">
            <div class="text-caption text-muted font-mono row items-center op-gap-4">
              <q-icon name="notifications_active" color="cyan-4" /> Global Comms
            </div>
          </div>
          <div class="text-h4 text-weight-bold text-main q-mb-sm">4,192 <span class="text-caption text-cyan-4">+8%</span></div>
          <q-linear-progress value="0.94" color="cyan-4" class="q-mb-xs" />
          <div class="row justify-between text-muted" style="font-size: 10px;">
            <span>94% Resolution Rate</span>
            <span class="text-amber-4">12 Critical Pending</span>
          </div>
        </q-card>

        <!-- SLA Metrics -->
        <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-md col-12 col-md-3">
          <div class="row items-center justify-between q-mb-xs">
            <div class="text-caption text-muted font-mono row items-center op-gap-4">
              <q-icon name="timer" color="purple-4" /> SLA Compliance
            </div>
          </div>
          <div class="text-h4 text-weight-bold text-main q-mb-sm">98.5% <span class="text-caption text-cyan-4">+1.2%</span></div>
          <q-linear-progress value="0.985" color="purple-4" class="q-mb-xs" />
          <div class="row justify-between text-muted" style="font-size: 10px;">
            <span>Target: 99.9%</span>
            <span class="text-red-4">2 Breached Today</span>
          </div>
        </q-card>

        <!-- Workflow Automation Metrics -->
        <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-md col-12 col-md-3">
          <div class="row items-center justify-between q-mb-xs">
            <div class="text-caption text-muted font-mono row items-center op-gap-4">
              <q-icon name="account_tree" color="indigo-4" /> Automation Health
            </div>
          </div>
          <div class="text-h4 text-weight-bold text-main q-mb-sm">100% <span class="text-caption text-cyan-4">+0%</span></div>
          <q-linear-progress value="1.0" color="indigo-4" class="q-mb-xs" />
          <div class="row justify-between text-muted" style="font-size: 10px;">
            <span>187 Executions</span>
            <span class="text-main">0 Failures</span>
          </div>
        </q-card>

        <!-- Governance Metrics -->
        <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-md col-12 col-md-3">
          <div class="row items-center justify-between q-mb-xs">
            <div class="text-caption text-muted font-mono row items-center op-gap-4">
              <q-icon name="admin_panel_settings" color="cyan-4" /> Gov. Health Score
            </div>
          </div>
          <div class="text-h4 text-weight-bold text-main q-mb-sm">96.8% <span class="text-caption text-cyan-4">+2.1%</span></div>
          <q-linear-progress value="0.968" color="cyan-4" class="q-mb-xs" />
          <div class="row justify-between text-muted" style="font-size: 10px;">
            <span>Op Efficiency: 99.2%</span>
            <span class="text-amber-4">14 Pending Apps</span>
          </div>
        </q-card>
      </div>
    </div>

    <!-- Executive KPI Layer (Larger Cards) -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel q-pa-md full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg" @click="openDrawer('Revenue')">
          <div class="text-subtitle2 text-muted text-uppercase tracking-wider">Gross Revenue (YTD) / Net</div>
          <div class="text-h3 text-metric-mono text-green-4 q-mt-sm">{{ currentCurrency.symbol }}1.24B</div>
          <div class="text-caption text-green-3 font-mono q-mt-xs">Net: {{ currentCurrency.symbol }}984M (79% Margin) <q-icon name="trending_up"/></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel q-pa-md full-height column justify-between bg-panel border-cyan-left cursor-pointer hover-bg" @click="openDrawer('Transactions')">
          <div class="text-subtitle2 text-muted text-uppercase tracking-wider">Total Txn Volume / Value</div>
          <div class="text-h3 text-metric-mono text-cyan-4 q-mt-sm">14.2M</div>
          <div class="text-caption text-cyan-3 font-mono q-mt-xs">Value: {{ currentCurrency.symbol }}84.5B <q-icon name="trending_up"/></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel q-pa-md full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg" @click="openDrawer('Ecosystem')">
          <div class="text-subtitle2 text-muted text-uppercase tracking-wider">Active Tenants / Ecosystem</div>
          <div class="text-h3 text-metric-mono text-amber-4 q-mt-sm">815</div>
          <div class="text-caption text-amber-3 font-mono q-mt-xs">142K Wallets | 42K Cards | 1.2K Terms</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel q-pa-md full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg" @click="openDrawer('Treasury')">
          <div class="text-subtitle2 text-muted text-uppercase tracking-wider">Settlement Success / Treasury</div>
          <div class="text-h3 text-metric-mono text-indigo-4 q-mt-sm">99.8%</div>
          <div class="text-caption text-indigo-3 font-mono q-mt-xs">Float: {{ currentCurrency.symbol }}4.2B | Exposure: LOW</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap" :class="{ 'board-view-mode': isBoardView }">
      
      <!-- Executive Categories Tabs -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-md">
        <q-tabs v-model="activeTab" dense class="text-grey-5 font-mono text-subtitle2" active-color="white" indicator-color="white" align="left" no-caps>
          <q-tab name="overview" label="Strategic Overview" />
          <q-tab name="health" label="Health Scores" />
          <q-tab name="finance" label="Finance" />
          <q-tab name="operations" label="Operations" />
          <q-tab name="revenue" label="Revenue" />
          <q-tab name="fraud" label="Fraud & Risk" />
          <q-tab name="compliance" label="Compliance" />
          <q-tab name="tenants" label="Tenants" />
          <q-tab name="treasury" label="Treasury" />
          <q-tab name="forecasting" label="AI Forecasts" />
        </q-tabs>

        <div class="row items-center op-gap-8" v-if="!isBoardView">
          <q-btn flat dense icon="open_in_new" color="cyan-4" size="sm" label="Open Modules" class="font-mono text-caption">
            <q-menu dark class="bg-panel border-muted font-mono text-caption">
              <q-list>
                <q-item clickable v-close-popup @click="navigateTo('/finance/revenue')"><q-item-section>Revenue Center</q-item-section></q-item>
                <q-item clickable v-close-popup @click="navigateTo('/finance/fraud')"><q-item-section>Fraud Center</q-item-section></q-item>
                <q-item clickable v-close-popup @click="navigateTo('/finance/compliance')"><q-item-section>Compliance Center</q-item-section></q-item>
                <q-item clickable v-close-popup @click="navigateTo('/finance/tenant-health')"><q-item-section>Tenant Center</q-item-section></q-item>
                <q-item clickable v-close-popup @click="navigateTo('/finance/settlements')"><q-item-section>Treasury Center</q-item-section></q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeTab" animated class="bg-transparent col" keep-alive>
        
        <!-- STRATEGIC OVERVIEW -->
        <q-tab-panel name="overview" class="q-pa-lg column no-wrap op-gap-24 scroll-y">
          <!-- Trends Row -->
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-6">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                <div class="row justify-between items-center q-mb-md">
                  <div class="text-subtitle1 text-weight-bold text-main font-mono">Revenue & Profitability Trend</div>
                  <q-icon name="show_chart" color="green-4" size="sm" />
                </div>
                <div class="flex flex-center bg-dark rounded-borders border-muted" style="height: 200px;">
                  <div class="text-muted font-mono">[ Chart: Revenue Growth Map ]</div>
                </div>
              </div>
            </div>
            <div class="col-12 col-md-6">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                <div class="row justify-between items-center q-mb-md">
                  <div class="text-subtitle1 text-weight-bold text-main font-mono">Platform Transaction Velocity</div>
                  <q-icon name="stacked_line_chart" color="cyan-4" size="sm" />
                </div>
                <div class="flex flex-center bg-dark rounded-borders border-muted" style="height: 200px;">
                  <div class="text-muted font-mono">[ Chart: Transaction Network ]</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Secondary Trends -->
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-4">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                <div class="text-subtitle2 text-muted font-mono q-mb-sm">Settlement & Treasury Flow</div>
                <div class="flex flex-center bg-dark rounded-borders border-muted" style="height: 120px;"><span class="text-muted text-caption">[ Chart ]</span></div>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                <div class="text-subtitle2 text-muted font-mono q-mb-sm">Fraud Exposure & Threat Maps</div>
                <div class="flex flex-center bg-dark rounded-borders border-muted" style="height: 120px;"><span class="text-muted text-caption">[ Chart ]</span></div>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height">
                <div class="text-subtitle2 text-muted font-mono q-mb-sm">Tenant Ecosystem Growth</div>
                <div class="flex flex-center bg-dark rounded-borders border-muted" style="height: 120px;"><span class="text-muted text-caption">[ Chart ]</span></div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- HEALTH SCORES -->
        <q-tab-panel name="health" class="q-pa-lg column no-wrap">
          <div class="text-h5 text-main font-mono q-mb-lg">Global Strategic Health Matrix</div>
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-sm-6 col-md-3" v-for="health in healthScores" :key="health.name">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders cursor-pointer hover-bg" @click="openDrawer(health.name)">
                <div class="row justify-between items-center q-mb-sm">
                  <div class="text-subtitle2 text-main font-mono">{{ health.name }}</div>
                  <q-icon :name="health.icon" :color="health.color" size="sm" />
                </div>
                <div class="row items-center justify-between">
                  <div class="text-h4 font-mono text-weight-bold" :class="`text-${health.color}`">{{ health.score }}</div>
                  <q-badge :color="health.color" text-color="white">{{ health.status }}</q-badge>
                </div>
                <div class="row items-center q-mt-sm font-mono text-caption text-muted">
                  <q-icon :name="health.trend > 0 ? 'trending_up' : (health.trend < 0 ? 'trending_down' : 'trending_flat')" class="q-mr-xs" :color="health.trend > 0 ? 'green-4' : (health.trend < 0 ? 'red-4' : 'grey-5')" />
                  <span>{{ Math.abs(health.trend) }}% vs Last Qtr</span>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- FORECASTING (AI) -->
        <q-tab-panel name="forecasting" class="q-pa-lg column no-wrap">
          <div class="text-h5 text-purple-3 font-mono q-mb-lg"><q-icon name="auto_awesome" /> AI Executive Forecasting Models</div>
          <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted" style="min-height: 400px;">
            <q-icon name="query_stats" size="xl" class="q-mb-md text-purple-4" />
            <div class="text-purple-4 text-weight-bold text-h6">Predictive Engine Online</div>
            <div class="text-caption q-mt-xs text-center" style="max-width: 600px;">
              Analyzing transaction velocity, seasonal tenant growth, real-time settlement float, and emerging threat vectors to generate predictive Q3/Q4 board forecasts.
            </div>
            <q-btn outline color="purple-4" label="Generate Strategic AI Report" class="q-mt-lg" icon="memory" />
          </div>
        </q-tab-panel>

        <!-- PLACEHOLDERS FOR AGGREGATE TABS -->
        <q-tab-panel name="finance" class="q-pa-md flex flex-center"><div class="text-muted font-mono text-h6">Finance & Ledger Aggregation View</div></q-tab-panel>
        <q-tab-panel name="operations" class="q-pa-md flex flex-center"><div class="text-muted font-mono text-h6">Fleet & Ecosystem Operations View</div></q-tab-panel>
        <q-tab-panel name="revenue" class="q-pa-md flex flex-center"><div class="text-muted font-mono text-h6">Revenue Center Aggregation View</div></q-tab-panel>
        <q-tab-panel name="fraud" class="q-pa-md flex flex-center"><div class="text-muted font-mono text-h6">Fraud Center Aggregation View</div></q-tab-panel>
        <q-tab-panel name="compliance" class="q-pa-md flex flex-center"><div class="text-muted font-mono text-h6">Compliance Center Aggregation View</div></q-tab-panel>
        <q-tab-panel name="tenants" class="q-pa-md flex flex-center"><div class="text-muted font-mono text-h6">Tenant Performance Aggregation View</div></q-tab-panel>
        <q-tab-panel name="treasury" class="q-pa-md flex flex-center"><div class="text-muted font-mono text-h6">Treasury & Settlements Aggregation View</div></q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- EXECUTIVE INVESTIGATION DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="700">
      <div v-if="selectedKPI" class="column full-height">
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <q-badge color="indigo-10" text-color="indigo-3" label="EXECUTIVE DRILL-DOWN" class="q-mb-sm" />
              <div class="text-h5 font-mono text-main">{{ selectedKPI.name }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>
        </div>
        <div class="q-pa-lg col font-mono text-muted flex flex-center">
          <div class="text-center">
            <q-icon name="insights" size="xl" class="q-mb-md opacity-50" />
            <div class="text-h6 text-main">Deep Drill-Down Interface</div>
            <div>Detailed breakdown, trend analysis, and underlying records for {{ selectedKPI.name }} will be rendered here.</div>
            <q-btn outline color="cyan-4" label="Open Dedicated Workspace" class="q-mt-lg" icon="launch" />
          </div>
        </div>
      </div>
    </q-drawer>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const activeTab = ref('overview')
const isBoardView = ref(false)

const drawerOpen = ref(false)
const selectedKPI = ref(null)

const toggleBoardView = () => {
  isBoardView.value = !isBoardView.value
  if (isBoardView.value) {
    activeTab.value = 'overview'
    // Optional: emit event to hide main layout sidebar for full screen presentation
  }
}

const openDrawer = (kpiName) => {
  selectedKPI.value = { name: kpiName }
  drawerOpen.value = true
}

const navigateTo = (path) => {
  router.push(path)
}

const healthScores = ref([
  { name: 'Platform Health Score', score: '98.4', status: 'STABLE', trend: 1.2, color: 'green-4', icon: 'monitor_heart' },
  { name: 'Financial Health Score', score: '99.1', status: 'OPTIMAL', trend: 2.4, color: 'green-4', icon: 'account_balance' },
  { name: 'Revenue Health Score', score: '92.5', status: 'GROWING', trend: 14.2, color: 'cyan-4', icon: 'payments' },
  { name: 'Operational Health', score: '96.8', status: 'STABLE', trend: 0.5, color: 'indigo-4', icon: 'precision_manufacturing' },
  { name: 'Fraud Defense Score', score: '94.2', status: 'SECURE', trend: -1.1, color: 'amber-4', icon: 'security' },
  { name: 'Compliance Health', score: '96.0', status: 'STABLE', trend: 0.0, color: 'purple-4', icon: 'policy' },
  { name: 'Tenant Health Score', score: '88.5', status: 'MONITORING', trend: -2.5, color: 'amber-4', icon: 'apartment' },
  { name: 'Treasury Health Score', score: '99.9', status: 'OPTIMAL', trend: 0.1, color: 'green-4', icon: 'account_balance_wallet' },
  { name: 'Governance Health', score: '96.8', status: 'STABLE', trend: 2.1, color: 'cyan-4', icon: 'admin_panel_settings' }
])

</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.hover-bg:hover {
  background: rgba(255, 255, 255, 0.03);
}
.scroll-y {
  overflow-y: auto;
}

.border-cyan-left { border-left: 3px solid #22b8cf !important; }
.border-indigo-left { border-left: 3px solid #7048e8 !important; }
.border-amber-left { border-left: 3px solid #fcc419 !important; }
.border-green-left { border-left: 3px solid #51cf66 !important; }
.border-red-left { border-left: 3px solid #c92a2a !important; }
.border-purple-left { border-left: 3px solid #be4bdb !important; }

.board-view-mode {
  /* Extra styling applied when in board presentation mode */
  border: 2px solid rgba(255,255,255,0.1);
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
}
</style>
