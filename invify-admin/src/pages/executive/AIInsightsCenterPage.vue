<!-- invify-admin/src/pages/executive/AIInsightsCenterPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & AI Intelligence Center -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-purple-3 text-uppercase tracking-wider"><q-icon name="auto_awesome" class="q-mr-xs"/>Predictive Intelligence Engine</div>
          <div class="text-h4 text-main text-weight-bolder" style="line-height: 1.1;">
            AI Insights Center
          </div>
        </div>

        <!-- AI Confidence Subpanel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 30px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Executive Confidence Score:</span>
            <q-badge color="purple-10" text-color="purple-3" class="text-subtitle2">94% HIGH</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Model Freshness:</span>
            <span class="text-green-4 text-weight-bold">LIVE (2m ago)</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Active Predictions:</span>
            <span class="text-cyan-4 text-weight-bold">142 Signals</span>
          </div>
          <q-icon name="memory" color="purple-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="sm" color="grey-6" icon="refresh" label="Recalculate Models" class="text-weight-bold" />
        <q-btn outline size="sm" color="cyan-4" icon="insights" label="Generate Exec Brief" class="text-weight-bold" />
        <q-btn-dropdown outline size="sm" color="purple-4" icon="summarize" label="Executive Summaries" class="text-weight-bold text-white" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Daily Executive Summary</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Weekly Risk & Growth</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Monthly Board Packet</q-item-section></q-item>
            <q-separator dark />
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Treasury Forecast Export</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Compliance Risk Export</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- AI Intelligence Dashboard (Forecasts) -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel q-pa-md full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg" @click="activeCategory = 'revenue'">
          <div class="text-subtitle2 text-muted text-uppercase tracking-wider">Revenue Forecast (30D)</div>
          <div class="text-h3 text-metric-mono text-green-4 q-mt-sm">↑ 12%</div>
          <div class="text-caption text-green-3 font-mono q-mt-xs">Expected: {{ currentCurrency.symbol }}145M | Confidence: 92%</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel q-pa-md full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg" @click="activeCategory = 'treasury'">
          <div class="text-subtitle2 text-muted text-uppercase tracking-wider">Liquidity Forecast (14D)</div>
          <div class="text-h3 text-metric-mono text-amber-4 q-mt-sm">PRESSURE</div>
          <div class="text-caption text-amber-3 font-mono q-mt-xs">Buffer recommended | Confidence: 88%</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel q-pa-md full-height column justify-between bg-panel border-red-left cursor-pointer hover-bg" @click="activeCategory = 'fraud'">
          <div class="text-subtitle2 text-muted text-uppercase tracking-wider">Fraud Escalation Risk</div>
          <div class="text-h3 text-metric-mono text-red-4 q-mt-sm">HIGH</div>
          <div class="text-caption text-red-3 font-mono q-mt-xs">Agent Network Vectors | Confidence: 96%</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel q-pa-md full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg" @click="activeCategory = 'tenants'">
          <div class="text-subtitle2 text-muted text-uppercase tracking-wider">Tenant Churn Prediction</div>
          <div class="text-h3 text-metric-mono text-indigo-4 q-mt-sm">LOW</div>
          <div class="text-caption text-indigo-3 font-mono q-mt-xs">High retention expected | Confidence: 94%</div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Prediction Categories Tabs -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-md">
        <q-tabs v-model="activeCategory" dense class="text-grey-5 font-mono text-subtitle2" active-color="purple-4" indicator-color="purple-4" align="left" no-caps>
          <q-tab name="all" label="All Insights Feed" icon="dynamic_feed" />
          <q-separator vertical class="q-mx-sm bg-dark" />
          <q-tab name="executive" label="Executive" />
          <q-tab name="revenue" label="Revenue" />
          <q-tab name="tenants" label="Tenants" />
          <q-tab name="fraud" label="Fraud & Risk" />
          <q-tab name="compliance" label="Compliance" />
          <q-tab name="treasury" label="Treasury" />
          <q-tab name="operations" label="Operations" />
          <q-tab name="terminals" label="Terminals" />
          <q-tab name="wallets" label="Wallets" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search Insights..." class="text-caption" style="width: 250px;">
            <template v-slot:append><q-icon name="search" color="grey-5" /></template>
          </q-input>
        </div>
      </div>

      <!-- INSIGHT FEED PANEL -->
      <div class="col q-pa-md scroll-y bg-dark">
        <div class="row q-col-gutter-lg">
          
          <!-- Insight Cards Column -->
          <div class="col-12 col-md-8 column op-gap-16">
            
            <div class="text-h6 font-mono text-main q-mb-sm">Strategic Insight Feed</div>

            <q-card v-for="insight in filteredInsights" :key="insight.id" flat class="bg-subpanel border-muted rounded-borders cursor-pointer insight-card" @click="inspectInsight(insight)">
              <div :class="`border-${insight.color}-left`" class="q-pa-md row op-gap-16 no-wrap items-start">
                <q-icon :name="insight.icon" :color="insight.color" size="lg" class="q-mt-xs" />
                <div class="col">
                  <div class="row justify-between items-start q-mb-xs">
                    <div class="text-subtitle1 text-weight-bold text-main">{{ insight.title }}</div>
                    <q-badge :color="`${insight.color}-10`" :text-color="`${insight.color}-3`" class="font-mono">{{ insight.confidence }}% Confidence</q-badge>
                  </div>
                  <div class="text-body2 text-muted q-mb-sm">{{ insight.summary }}</div>
                  
                  <!-- Explainability Layer Preview -->
                  <div class="bg-dark q-pa-sm rounded-borders border-muted font-mono text-caption">
                    <div class="text-weight-bold text-main q-mb-xs">AI Reasoning:</div>
                    <div class="text-muted">{{ insight.reasoningPreview }}</div>
                  </div>
                  
                  <div class="row items-center op-gap-12 q-mt-md font-mono text-caption">
                    <span :class="`text-${insight.color}`"><q-icon name="arrow_forward" class="q-mr-xs"/>{{ insight.actionText }}</span>
                    <span class="text-muted">| Model: {{ insight.modelName }}</span>
                  </div>
                </div>
              </div>
            </q-card>

          </div>

          <!-- Recommendation Center Column -->
          <div class="col-12 col-md-4 column op-gap-16">
            <div class="text-h6 font-mono text-main q-mb-sm">Recommendation Center</div>
            
            <!-- Automation Intel -->
            <div class="enterprise-subpanel q-pa-md border-muted rounded-borders bg-dark q-mb-md">
              <div class="row items-center op-gap-8 q-mb-md">
                <q-icon name="smart_toy" color="indigo-4" size="sm"/>
                <div class="text-subtitle2 text-weight-bold text-indigo-4">Automation Opportunities</div>
              </div>
              <div class="column op-gap-12 font-mono text-caption">
                <div class="border-bottom q-pb-sm">
                  <div class="text-muted q-mb-xs">Workflow Bottleneck</div>
                  <div class="row justify-between items-center">
                    <span class="text-main">Compliance Approvals</span>
                    <q-badge color="amber-10" text-color="amber-4">42m avg delay</q-badge>
                  </div>
                </div>
                <div>
                  <div class="text-muted q-mb-xs">Suggested Workflow</div>
                  <div class="row justify-between items-center">
                    <span class="text-main">Auto-approve Tier 1 KYC</span>
                    <span class="text-indigo-4 cursor-pointer">Generate Draft <q-icon name="arrow_forward" /></span>
                  </div>
                </div>
              </div>
            </div>

            <div class="enterprise-subpanel q-pa-md border-muted rounded-borders">
              <div class="row items-center op-gap-8 q-mb-md">
                <q-icon name="lightbulb" color="amber-4" size="sm"/>
                <div class="text-subtitle2 text-weight-bold text-amber-4">Actionable Recommendations</div>
              </div>
              <q-list separator dark class="font-mono text-caption bg-transparent">
                <q-item clickable class="hover-bg">
                  <q-item-section>
                    <q-item-label class="text-main">Prepare liquidity buffer for settlements</q-item-label>
                    <q-item-label caption class="text-red-3">Urgent (Treasury Pressure)</q-item-label>
                  </q-item-section>
                  <q-item-section side><q-icon name="chevron_right" color="cyan-4" /></q-item-section>
                </q-item>
                <q-item clickable class="hover-bg">
                  <q-item-section>
                    <q-item-label class="text-main">Increase review of Agent Network</q-item-label>
                    <q-item-label caption class="text-amber-3">High Fraud Risk Horizon</q-item-label>
                  </q-item-section>
                  <q-item-section side><q-icon name="chevron_right" color="cyan-4" /></q-item-section>
                </q-item>
                <q-item clickable class="hover-bg">
                  <q-item-section>
                    <q-item-label class="text-main">Expand School Segment marketing</q-item-label>
                    <q-item-label caption class="text-green-3">Growth Opportunity Predicted</q-item-label>
                  </q-item-section>
                  <q-item-section side><q-icon name="chevron_right" color="cyan-4" /></q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Executive Summary Generator Panel -->
            <div class="enterprise-subpanel q-pa-md border-muted rounded-borders bg-indigo-10">
              <div class="row items-center op-gap-8 q-mb-sm">
                <q-icon name="subject" color="indigo-3" size="sm"/>
                <div class="text-subtitle2 text-weight-bold text-indigo-2">Executive Brief Generator</div>
              </div>
              <div class="text-caption text-indigo-2 q-mb-md font-mono">
                Compile strategic narratives from active AI insights across all domains.
              </div>
              <div class="row op-gap-8">
                <q-btn outline color="indigo-3" label="Daily Brief" size="sm" class="col" />
                <q-btn outline color="indigo-3" label="Board Summary" size="sm" class="col" />
              </div>
            </div>

            <!-- AI Governance Intelligence -->
            <div class="enterprise-subpanel q-pa-md border-muted rounded-borders bg-dark">
              <div class="row items-center op-gap-8 q-mb-sm">
                <q-icon name="admin_panel_settings" color="cyan-4" size="sm"/>
                <div class="text-subtitle2 text-weight-bold text-cyan-4">AI Governance Intelligence</div>
              </div>
              <div class="column op-gap-12 font-mono text-caption q-mt-md">
                <div class="row items-start op-gap-8">
                  <q-icon name="insights" color="cyan-4" class="q-mt-xs" />
                  <div class="col text-muted">
                    <span class="text-main text-weight-bold">Policy Gap Detected:</span> AI indicates high manual override rate on Tier 2 KYC. Recommended automated workflow creation.
                  </div>
                </div>
                <div class="row items-start op-gap-8">
                  <q-icon name="warning" color="amber-4" class="q-mt-xs" />
                  <div class="col text-muted">
                    <span class="text-main text-weight-bold">Approval Bottleneck:</span> Compliance Approver queue is growing. AI predicts an SLA breach within 4 hours if not reassigned.
                  </div>
                </div>
              </div>
            </div>

            <!-- Notification Intel & Alert Fatigue -->
            <div class="enterprise-subpanel q-pa-md border-muted rounded-borders bg-dark">
              <div class="row items-center op-gap-8 q-mb-sm">
                <q-icon name="notifications_off" color="amber-4" size="sm"/>
                <div class="text-subtitle2 text-weight-bold text-amber-4">Alert Fatigue Analysis</div>
              </div>
              <div class="column op-gap-12 font-mono text-caption q-mt-md">
                <div class="border-bottom q-pb-sm">
                  <div class="text-muted q-mb-xs">Highest Fatigue Risk (Hotspot)</div>
                  <div class="row justify-between items-center">
                    <span class="text-main">Fraud (Velocity)</span>
                    <q-badge color="amber-10" text-color="amber-4">92% Ignored</q-badge>
                  </div>
                </div>
                <div class="border-bottom q-pb-sm">
                  <div class="text-muted q-mb-xs">Escalation Trends</div>
                  <div class="row justify-between items-center">
                    <span class="text-main">Settlement Batches</span>
                    <q-badge color="red-10" text-color="red-4">+14% YoY</q-badge>
                  </div>
                </div>
                <div class="border-bottom q-pb-sm">
                  <div class="text-muted q-mb-xs">Predicted SLA Breaches</div>
                  <div class="row justify-between items-center">
                    <span class="text-main">Compliance KYC</span>
                    <span class="text-red-4 font-weight-bold">4 Expected Today</span>
                  </div>
                </div>
                <div>
                  <div class="text-muted q-mb-xs">Predicted Response Time</div>
                  <div class="row justify-between items-center">
                    <span class="text-main">Compliance KYC</span>
                    <span class="text-cyan-4">2.4h <q-icon name="trending_up" /></span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- AI INVESTIGATION DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="800">
      <div v-if="selectedInsight" class="column full-height">
        
        <!-- Drawer Header & Action Center -->
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <q-badge :color="`${selectedInsight.color}-10`" :text-color="`${selectedInsight.color}-3`" label="AI INSIGHT DEEP DIVE" class="q-mb-sm" />
              <div class="text-h5 font-mono text-main">{{ selectedInsight.title }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- AI Action Center -->
          <div class="row items-center op-gap-8 bg-dark q-pa-sm rounded-borders border-muted">
            <div class="text-caption font-mono text-muted q-mr-sm">ACTIONS:</div>
            <q-btn outline size="xs" color="cyan-4" icon="launch" label="Open Workspace" />
            <q-btn outline size="xs" color="amber-4" icon="gavel" label="Create Investigation" />
            <q-btn outline size="xs" color="purple-4" icon="groups" label="Assign Team" />
            <q-space />
            <q-btn outline size="xs" color="grey-6" icon="warning" label="Escalate Risk" />
            <q-btn outline size="xs" color="grey-6" icon="download" label="Export Insight" />
          </div>
        </div>

        <q-scroll-area class="col q-pa-lg">
          <div class="column op-gap-24">
            
            <!-- Insight Overview -->
            <div>
              <div class="text-subtitle1 text-weight-bold text-main font-mono q-mb-xs">Insight Overview</div>
              <div class="text-body2 text-muted">{{ selectedInsight.summary }}</div>
            </div>

            <!-- Explainability Layer -->
            <div class="enterprise-subpanel q-pa-md border-muted rounded-borders bg-dark">
              <div class="row items-center op-gap-8 q-mb-md">
                <q-icon name="psychology" color="purple-4" size="md"/>
                <div class="text-subtitle1 text-weight-bold text-purple-3 font-mono">Explainability Layer</div>
              </div>
              
              <div class="q-mb-md">
                <div class="text-caption text-muted font-mono q-mb-xs">Why was this prediction made?</div>
                <div class="text-main">{{ selectedInsight.explanationText }}</div>
              </div>
              
              <div class="row q-col-gutter-md font-mono text-caption">
                <div class="col-6">
                  <div class="text-muted q-mb-xs">Contributing Signals:</div>
                  <ul class="q-pl-md q-my-none text-cyan-3">
                    <li v-for="sig in selectedInsight.signals" :key="sig">{{ sig }}</li>
                  </ul>
                </div>
                <div class="col-6">
                  <div class="text-muted q-mb-xs">Affected Entities:</div>
                  <ul class="q-pl-md q-my-none text-amber-3">
                    <li v-for="ent in selectedInsight.entities" :key="ent">{{ ent }}</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Confidence Engine Metrics -->
            <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
              <div class="text-weight-bold text-main q-mb-md">Confidence Engine Metrics</div>
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <div class="row justify-between q-mb-xs"><span class="text-muted">Confidence Score:</span><span class="text-green-4">{{ selectedInsight.confidence }}%</span></div>
                  <div class="row justify-between q-mb-xs"><span class="text-muted">Prediction Strength:</span><span class="text-main">HIGH</span></div>
                  <div class="row justify-between q-mb-xs"><span class="text-muted">Risk Weight:</span><span class="text-red-4">{{ selectedInsight.riskWeight }}</span></div>
                </div>
                <div class="col-6">
                  <div class="row justify-between q-mb-xs"><span class="text-muted">Data Coverage:</span><span class="text-cyan-4">98.5%</span></div>
                  <div class="row justify-between q-mb-xs"><span class="text-muted">Model Freshness:</span><span class="text-main">LIVE</span></div>
                  <div class="row justify-between q-mb-xs"><span class="text-muted">Model Used:</span><span class="text-main">{{ selectedInsight.modelName }}</span></div>
                </div>
              </div>
            </div>

            <!-- Recommended Actions -->
            <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
              <div class="text-weight-bold text-amber-4 q-mb-md"><q-icon name="lightbulb" class="q-mr-xs"/>Suggested Next Steps</div>
              <ul class="q-pl-md q-my-none text-main">
                <li v-for="action in selectedInsight.suggestedActions" :key="action" class="q-mb-sm">{{ action }}</li>
              </ul>
            </div>

          </div>
        </q-scroll-area>
      </div>
    </q-drawer>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, computed } from 'vue'

const activeCategory = ref('all')
const searchQuery = ref('')
const drawerOpen = ref(false)
const selectedInsight = ref(null)

const inspectInsight = (insight) => {
  selectedInsight.value = insight
  drawerOpen.value = true
}

const allInsights = ref([
  {
    id: 'INS-001',
    category: 'revenue',
    title: 'Revenue expected to increase by 12% next month',
    summary: 'Based on current transaction velocity and historical seasonal patterns in the School segment, gross platform revenue is projected to hit {{ currentCurrency.symbol }}145M.',
    color: 'green',
    icon: 'trending_up',
    confidence: 92,
    modelName: 'RevForecast_v4',
    reasoningPreview: 'School segment returning from holiday period; 24% spike in wallet funding observed over 7 days.',
    explanationText: 'The model detected a sustained 24% week-over-week increase in inbound wallet funding across the School segment, perfectly aligning with historical patterns preceding academic term starts. Terminal transactions in related geographic zones also show a 14% uptick.',
    signals: ['Wallet Funding Spike (+24%)', 'Historical Term Starts', 'Geographic Terminal Activity'],
    entities: ['Ahmadu Bello University', 'University of Lagos', 'School Segment (Global)'],
    riskWeight: 'LOW',
    actionText: 'Review Revenue Forecast',
    suggestedActions: ['Expand School Segment marketing budget by 10%.', 'Ensure Settlement routing liquidity can handle increased volume.', 'Generate Q3 Revenue Projections for Board.']
  },
  {
    id: 'INS-002',
    category: 'treasury',
    title: 'Treasury liquidity pressure expected in next 14 days',
    summary: 'A convergence of high-volume school fee settlements and weekend retail batch delays is likely to create temporary liquidity pressure in the primary settlement account.',
    color: 'amber',
    icon: 'account_balance_wallet',
    confidence: 88,
    modelName: 'LiquidityRisk_v2',
    reasoningPreview: 'Pending settlement pipeline exceeds historical weekend threshold by 18%.',
    explanationText: 'The treasury anomaly detection model flagged that the volume of un-settled, high-value transactions currently in the ledger is outpacing the historical weekend processing capability of our primary banking partner. Without a buffer, delays are probable.',
    signals: ['Ledger/Settlement Delta', 'Bank Partner Processing Windows', 'High Value Txn Spikes'],
    entities: ['Primary Settlement Account', 'Guaranty Trust Partner'],
    riskWeight: 'HIGH',
    actionText: 'Open Treasury Workspace',
    suggestedActions: ['Prepare a {{ currentCurrency.symbol }}50M liquidity buffer for Monday morning settlements.', 'Review pending Ledger batches to prioritize School payouts.']
  },
  {
    id: 'INS-003',
    category: 'fraud',
    title: 'Fraud risk increasing among Agent Network',
    summary: 'A novel velocity abuse pattern is emerging across the South West agent network, bypassing standard rules.',
    color: 'red',
    icon: 'security',
    confidence: 96,
    modelName: 'VelocityThreat_AI',
    reasoningPreview: 'Correlated micro-transactions detected across 42 geographically linked terminals.',
    explanationText: 'The threat correlation engine found a structural link between 42 different terminals in the South West. These terminals are independently executing micro-transactions that collectively form a high-velocity extraction pattern consistent with wallet-draining attacks.',
    signals: ['Terminal Geo-Clustering', 'Micro-Txn Velocity', 'Shared Beneficiary Wallets'],
    entities: ['Agent Network (South West)', 'Terminals: TRM-AGT-*', 'Wallet: WAL-AGT-8812'],
    riskWeight: 'CRITICAL',
    actionText: 'Open Fraud Monitoring',
    suggestedActions: ['Freeze associated beneficiary wallets immediately.', 'Suspend the 42 implicated terminals.', 'Assign Fraud Team to Case CAS-2026-8812.']
  },
  {
    id: 'INS-004',
    category: 'compliance',
    title: 'Merchant BetKing likely to require compliance review',
    summary: 'Transaction patterns suggest potential threshold breach for enhanced due diligence (EDD) reporting.',
    color: 'purple',
    icon: 'policy',
    confidence: 85,
    modelName: 'RegRisk_Engine',
    reasoningPreview: 'Transaction volume nearing {{ currentCurrency.symbol }}100M monthly limit without Tier 4 KYC.',
    explanationText: 'The compliance engine predicts that at the current daily processing rate, the tenant will breach the Tier 3 limits within 4 days, which legally requires an immediate freeze or escalation to Tier 4 EDD.',
    signals: ['Run-rate Txn Volume', 'Current KYC Tier Limits'],
    entities: ['BetKing (TEN-RET-992)'],
    riskWeight: 'MEDIUM',
    actionText: 'Review Compliance Case',
    suggestedActions: ['Request Tier 4 Documents (Proof of Address, Ultimate Beneficial Owner).', 'Schedule automated hold if documents not received in 3 days.']
  }
])

const filteredInsights = computed(() => {
  let list = allInsights.value
  if (activeCategory.value !== 'all') {
    list = list.filter(i => i.category === activeCategory.value)
  }
  if (searchQuery.value) {
    list = list.filter(i => i.title.toLowerCase().includes(searchQuery.value.toLowerCase()))
  }
  return list
})

</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.hover-bg:hover { background: rgba(255, 255, 255, 0.03); }
.scroll-y { overflow-y: auto; }

.insight-card {
  transition: all 0.2s ease;
}
.insight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.border-cyan-left { border-left: 3px solid #22b8cf !important; }
.border-indigo-left { border-left: 3px solid #7048e8 !important; }
.border-amber-left { border-left: 3px solid #fcc419 !important; }
.border-green-left { border-left: 3px solid #51cf66 !important; }
.border-red-left { border-left: 3px solid #c92a2a !important; }
.border-purple-left { border-left: 3px solid #be4bdb !important; }
</style>
