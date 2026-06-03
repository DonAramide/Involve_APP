<!-- invify-admin/src/pages/finance/RevenueOperationsCenterPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    
    <!-- Header & Revenue Intelligence Center -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Financial Intelligence Center</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            Revenue Operations Center
          </div>
        </div>

        <!-- Revenue Intelligence Subpanel -->
        <div class="enterprise-subpanel q-px-md q-py-xs border-muted rounded-borders row items-center op-gap-16 font-mono text-caption" style="margin-left: 20px;">
          <div class="row items-center op-gap-8">
            <span class="text-muted">Top Revenue Source:</span>
            <span class="text-green-4 text-weight-bold text-subtitle2">Transaction Fees</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Growth Trend:</span>
            <q-badge color="green-10" text-color="green-3"><q-icon name="trending_up" size="xs" class="q-mr-xs"/>+14.2%</q-badge>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Concentration Risk:</span>
            <span class="text-amber-4 text-weight-bold">MEDIUM (School Sector)</span>
          </div>
          <div class="row items-center op-gap-8">
            <span class="text-muted">Top Merchant:</span>
            <span class="text-cyan-4 text-weight-bold">Shoprite Mega Store</span>
          </div>
          <q-icon name="insights" color="green-4" size="sm" />
        </div>
      </div>

      <!-- Command Bar Actions -->
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh Analytics" class="text-caption text-weight-bold" />
        <q-btn-dropdown size="xs" color="indigo-4" icon="pie_chart" label="Revenue Reports" class="text-caption text-weight-bold text-white" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Daily Revenue Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Monthly Revenue Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Tenant Revenue Report</q-item-section></q-item>
            <q-separator dark />
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>School Revenue Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Retail Revenue Report</q-item-section></q-item>
            <q-separator dark />
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Terminal Revenue Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Wallet Revenue Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Card Revenue Report</q-item-section></q-item>
            <q-separator dark />
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Commission Report</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Profitability Report</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn-dropdown outline size="xs" color="grey-6" icon="download" label="Export Data" class="text-caption text-weight-bold" split>
          <q-list dark class="bg-panel font-mono text-caption border-muted">
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>CSV</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>Excel</q-item-section></q-item>
            <q-item clickable v-close-popup class="hover-bg"><q-item-section>PDF</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- Revenue KPI Dashboard -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Gross Revenue (MTD)</div>
          <div class="text-h5 text-metric-mono text-green-4">{{ currentCurrency.symbol }}1.24B <q-icon name="trending_up" size="xs"/></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Net Revenue (Margin)</div>
          <div class="text-h5 text-metric-mono text-cyan-4">{{ currentCurrency.symbol }}984M <span class="text-caption text-muted">(79%)</span></div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-indigo-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Avg Rev Per Tenant</div>
          <div class="text-h5 text-metric-mono text-indigo-4">{{ currentCurrency.symbol }}142.5K</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-amber-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Avg Rev Per Txn</div>
          <div class="text-h5 text-metric-mono text-amber-5">{{ currentCurrency.symbol }}14.20</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-purple-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Recurring / Comm Vol</div>
          <div class="text-h5 text-metric-mono text-purple-4">{{ currentCurrency.symbol }}45M / {{ currentCurrency.symbol }}120M</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-red-left cursor-pointer hover-bg">
          <div class="text-operator-title text-muted">Forecast (End of Mo)</div>
          <div class="text-h5 text-metric-mono text-main">{{ currentCurrency.symbol }}2.1B <span class="text-green-4">+5%</span></div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      
      <!-- Queue Tabs & Command Bar Search -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-sm">
        <q-tabs v-model="activeWorkspaceTab" dense class="text-grey-5" active-color="amber-4" indicator-color="amber-4" align="left">
          <q-tab name="analysis" label="Revenue Analysis Grid" icon="table_chart" />
          <q-tab name="forecasting" label="AI Forecasting Engine" icon="online_prediction" />
          <q-tab name="profitability" label="Profitability Insights" icon="ssid_chart" />
        </q-tabs>

        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="filter_list" color="grey-5" size="sm"><q-tooltip>Advanced Filters</q-tooltip></q-btn>
          <q-input dense outlined bg-color="dark" v-model="searchQuery" placeholder="Search REV ID, TYPE, TENANT..." class="text-caption" style="width: 280px;">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Workspace Panels -->
      <q-tab-panels v-model="activeWorkspaceTab" animated class="bg-transparent col" keep-alive>
        
        <!-- REVENUE ANALYSIS GRID PANEL -->
        <q-tab-panel name="analysis" class="q-pa-none column no-wrap">
          <div class="bg-subpanel border-bottom scroll-x">
            <q-tabs v-model="activeCategoryTab" dense class="text-grey-5 font-mono text-caption" active-color="cyan-4" align="left" no-caps>
              <q-tab name="transaction" label="Transaction Fees" />
              <q-tab name="settlement" label="Settlement Fees" />
              <q-tab name="wallet" label="Wallet Revenue" />
              <q-tab name="card" label="Card Revenue" />
              <q-tab name="terminal" label="Terminal Revenue" />
              <q-tab name="subscription" label="Subscription" />
              <q-tab name="commission" label="Commission" />
              <q-separator vertical class="q-mx-sm bg-dark" />
              <q-tab name="school" label="School" />
              <q-tab name="retail" label="Retail" />
              <q-tab name="service" label="Service" />
              <q-tab name="agent" label="Agent" />
            </q-tabs>
          </div>
          
          <q-table
            class="bg-transparent text-main flex-grow-1 transaction-table"
            flat
            :rows="revenueRecords"
            :columns="revenueCols"
            row-key="id"
            dense
            virtual-scroll
            style="height: 100%;"
            selection="multiple"
            v-model:selected="selectedRecords"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props" class="font-mono text-amber-3 cursor-pointer text-weight-bold hover-underline" @click="inspectRevenue(props.row)">
                {{ props.value }}
              </q-td>
            </template>
            <template v-slot:body-cell-revenueAmount="props">
              <q-td :props="props" class="font-mono text-right text-green-4 text-weight-bold">
                {{ currentCurrency.symbol }}{{ props.value.toLocaleString() }}
              </q-td>
            </template>
            <template v-slot:body-cell-costAmount="props">
              <q-td :props="props" class="font-mono text-right text-red-4">
                {{ currentCurrency.symbol }}{{ props.value.toLocaleString() }}
              </q-td>
            </template>
            <template v-slot:body-cell-netRevenue="props">
              <q-td :props="props" class="font-mono text-right text-main text-weight-bold">
                {{ currentCurrency.symbol }}{{ props.value.toLocaleString() }}
              </q-td>
            </template>
            <template v-slot:body-cell-margin="props">
              <q-td :props="props" class="font-mono text-right" :class="props.value > 50 ? 'text-green-4' : 'text-amber-4'">
                {{ props.value }}%
              </q-td>
            </template>
            <template v-slot:body-cell-growth="props">
              <q-td :props="props" class="font-mono text-right">
                <span v-if="props.value > 0" class="text-green-4">+{{ props.value }}%</span>
                <span v-else-if="props.value < 0" class="text-red-4">{{ props.value }}%</span>
                <span v-else class="text-muted">{{ props.value }}%</span>
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

        <!-- FORECASTING & PROFITABILITY PLACEHOLDERS -->
        <q-tab-panel name="forecasting" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">AI Revenue Forecasting Engine</div>
          <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted">
            <q-icon name="online_prediction" size="xl" class="q-mb-md opacity-50" />
            <div>Predictive Models Currently Training (78% Complete)</div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="profitability" class="q-pa-md column">
          <div class="text-h6 font-mono text-main q-mb-md">Profitability & Margin Insights</div>
          <div class="enterprise-subpanel q-pa-md border-muted rounded-borders flex flex-center column font-mono text-muted">
            <q-icon name="ssid_chart" size="xl" class="q-mb-md opacity-50" />
            <div>Margin Analytics Dashboard Loading...</div>
          </div>
        </q-tab-panel>

      </q-tab-panels>
    </div>

    <!-- REVENUE INSPECTION DRAWER -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="950">
      <div v-if="selectedRevenue" class="column full-height">
        
        <!-- Drawer Header & Action Center -->
        <div class="q-pa-md border-bottom bg-subpanel column op-gap-12">
          <div class="row justify-between items-start">
            <div>
              <div class="row items-center op-gap-8 q-mb-xs">
                <q-badge color="green-10" text-color="green-3" label="REVENUE COMMAND" />
                <div class="text-h5 font-mono text-main">{{ selectedRevenue.id }}</div>
                <q-badge color="grey-9" text-color="grey-4">{{ selectedRevenue.period }}</q-badge>
              </div>
              <div class="text-caption text-muted font-mono">Revenue Type: {{ selectedRevenue.revenueType }} | Tenant: {{ selectedRevenue.tenant }}</div>
            </div>
            <q-btn flat dense round icon="close" v-close-popup />
          </div>

          <!-- Operational Action Center -->
          <div class="row items-center op-gap-8 bg-dark q-pa-sm rounded-borders border-muted">
            <div class="text-caption font-mono text-muted q-mr-sm">ACTIONS:</div>
            <q-btn outline size="xs" color="cyan-4" icon="assessment" label="Generate Sub-Report" />
            <q-btn outline size="xs" color="amber-4" icon="plagiarism" label="Investigate Variance" />
            <q-btn outline size="xs" color="red-4" icon="gavel" label="Escalate Review" />
            <q-space />
            <q-btn outline size="xs" color="grey-6" icon="receipt_long" label="View Ledger" />
            <q-btn outline size="xs" color="grey-6" icon="open_in_new" label="View Transactions" />
            <q-btn outline size="xs" color="grey-6" icon="download" label="Export Data" />
          </div>
        </div>

        <!-- Drawer Tabs -->
        <q-tabs v-model="drawerTab" dense class="text-grey-5 font-mono text-caption border-bottom scroll-x" active-color="amber-4" align="left" no-caps>
          <q-tab name="overview" label="Overview" />
          <q-tab name="breakdown" label="Breakdown" />
          <q-tab name="transactions" label="Txn Sources" />
          <q-tab name="wallets" label="Wallet Sources" />
          <q-tab name="cards" label="Card Sources" />
          <q-tab name="terminals" label="Terminal Sources" />
          <q-tab name="settlements" label="Settlement Sources" />
          <q-tab name="profitability" label="Profitability" />
          <q-tab name="risk" label="Risk Analysis" />
          <q-tab name="forecasting" label="Forecasting" />
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
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Revenue Entity</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Revenue Type:</span><span class="text-cyan-4">{{ selectedRevenue.revenueType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant:</span><span class="text-main">{{ selectedRevenue.tenant }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Tenant Type:</span><span class="text-main">{{ selectedRevenue.tenantType }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Period:</span><span class="text-amber-4">{{ selectedRevenue.period }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Source Txns:</span><span class="text-main">{{ selectedRevenue.txnCount.toLocaleString() }}</span></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="enterprise-subpanel q-pa-md border-muted rounded-borders full-height bg-dark">
                    <div class="text-caption text-muted font-mono q-mb-sm border-bottom q-pb-xs">Profitability Profile</div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Gross Revenue:</span><span class="text-green-4">{{ currentCurrency.symbol }}{{ selectedRevenue.revenueAmount.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Processing Cost:</span><span class="text-red-4">{{ currentCurrency.symbol }}{{ selectedRevenue.costAmount.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mt-sm border-top q-pt-sm font-mono text-weight-bold"><span class="text-muted">Net Profit:</span><span class="text-main text-h6" style="line-height: 1;">{{ currentCurrency.symbol }}{{ selectedRevenue.netRevenue.toLocaleString() }}</span></div>
                    <div class="row justify-between q-mt-sm font-mono"><span class="text-muted">Margin:</span><span class="text-cyan-4">{{ selectedRevenue.margin }}%</span></div>
                    <div class="row justify-between q-mt-xs font-mono"><span class="text-muted">Growth (MoM):</span><span :class="selectedRevenue.growth > 0 ? 'text-green-4' : 'text-red-4'">{{ selectedRevenue.growth > 0 ? '+' : '' }}{{ selectedRevenue.growth }}%</span></div>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- BREAKDOWN -->
            <q-tab-panel name="breakdown" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md">Revenue Stream Breakdown</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Transaction Fee Revenue:</span><span class="text-main">{{ currentCurrency.symbol }}{{ (selectedRevenue.revenueAmount * 0.6).toLocaleString() }} (60%)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Terminal Rental Revenue:</span><span class="text-main">{{ currentCurrency.symbol }}{{ (selectedRevenue.revenueAmount * 0.25).toLocaleString() }} (25%)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Commission Revenue:</span><span class="text-main">{{ currentCurrency.symbol }}{{ (selectedRevenue.revenueAmount * 0.1).toLocaleString() }} (10%)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Settlement Surcharges:</span><span class="text-main">{{ currentCurrency.symbol }}{{ (selectedRevenue.revenueAmount * 0.05).toLocaleString() }} (5%)</span></div>
              </div>
            </q-tab-panel>

            <!-- RISK ANALYSIS -->
            <q-tab-panel name="risk" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="row items-center op-gap-8 q-mb-md">
                  <q-circular-progress show-value class="text-caption text-white" :value="selectedRevenue.riskScore" size="50px" :color="selectedRevenue.riskScore > 80 ? 'red-5' : 'green-5'" track-color="dark" thickness="0.3">{{ selectedRevenue.riskScore }}</q-circular-progress>
                  <div>
                    <div class="text-weight-bold">Revenue Integrity Assessment</div>
                    <div class="text-caption text-muted">AI Anomaly Score: {{ selectedRevenue.anomalyScore }}</div>
                    <div class="text-caption text-indigo-3">Concentration Risk: LOW</div>
                  </div>
                </div>
                <div class="text-caption text-muted border-bottom q-pb-xs q-mb-sm">Revenue Risk Flags</div>
                <div class="row op-gap-8">
                  <q-badge color="red-10" text-color="red-3" v-for="flag in selectedRevenue.fraudFlags" :key="flag">{{ flag }}</q-badge>
                  <span v-if="!selectedRevenue.fraudFlags || selectedRevenue.fraudFlags.length === 0" class="text-green-4">None Detected</span>
                </div>
              </div>
            </q-tab-panel>

            <!-- FORECASTING (AI Hooks) -->
            <q-tab-panel name="forecasting" class="q-pa-md column">
              <div class="enterprise-subpanel q-pa-md border-muted rounded-borders font-mono">
                <div class="text-weight-bold q-mb-md text-purple-3"><q-icon name="auto_graph" class="q-mr-xs" /> AI Predictive Analytics</div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Projected Revenue (Next Period):</span><span class="text-main">{{ currentCurrency.symbol }}{{ (selectedRevenue.revenueAmount * 1.05).toLocaleString() }}</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Growth Forecast:</span><span class="text-green-4">+5.0%</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Predicted Margin:</span><span class="text-main">80%</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Seasonality Impact:</span><span class="text-amber-4">HIGH (Back-to-school peak)</span></div>
                <div class="row justify-between q-mb-xs font-mono"><span class="text-muted">Confidence Score:</span><span class="text-indigo-3">{{ selectedRevenue.confidenceScore }}%</span></div>
              </div>
            </q-tab-panel>

            <!-- PLACEHOLDERS FOR OTHERS -->
            <q-tab-panel name="transactions" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Transaction Source Volume View</div></q-tab-panel>
            <q-tab-panel name="wallets" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Wallet Fee Source View</div></q-tab-panel>
            <q-tab-panel name="cards" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Card Fee Source View</div></q-tab-panel>
            <q-tab-panel name="terminals" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Terminal Revenue Source View</div></q-tab-panel>
            <q-tab-panel name="settlements" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Settlement Fee Source View</div></q-tab-panel>
            <q-tab-panel name="profitability" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Deep Margin & Profitability Analysis</div></q-tab-panel>
            <q-tab-panel name="audit" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Revenue Adjustment Audit Trail</div></q-tab-panel>
            <q-tab-panel name="timeline" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Chronological Revenue Events</div></q-tab-panel>
            <q-tab-panel name="related" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Related Records View</div></q-tab-panel>
            <q-tab-panel name="resolution" class="q-pa-md flex flex-center"><div class="text-muted font-mono">Resolution & Correction History</div></q-tab-panel>

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

const activeWorkspaceTab = ref('analysis')
const activeCategoryTab = ref('transaction')
const searchQuery = ref('')
const selectedRecords = ref([])

const drawerOpen = ref(false)
const drawerTab = ref('overview')
const selectedRevenue = ref(null)

const inspectRevenue = (row) => {
  selectedRevenue.value = row
  drawerOpen.value = true
  drawerTab.value = 'overview'
}

// INVESTIGATION GRID DATA
const revenueCols = [
  { name: 'id', label: 'REVENUE ID', field: 'id', align: 'left' },
  { name: 'revenueType', label: 'TYPE', field: 'revenueType', align: 'left' },
  { name: 'tenant', label: 'TENANT', field: 'tenant', align: 'left' },
  { name: 'tenantType', label: 'SECTOR', field: 'tenantType', align: 'left' },
  { name: 'period', label: 'PERIOD', field: 'period', align: 'left' },
  { name: 'txnCount', label: 'TXNS', field: 'txnCount', align: 'right' },
  { name: 'revenueAmount', label: 'GROSS (₦)', field: 'revenueAmount', align: 'right' },
  { name: 'costAmount', label: 'COST (₦)', field: 'costAmount', align: 'right' },
  { name: 'netRevenue', label: 'NET (₦)', field: 'netRevenue', align: 'right' },
  { name: 'margin', label: 'MARGIN', field: 'margin', align: 'right' },
  { name: 'growth', label: 'GROWTH', field: 'growth', align: 'right' },
  { name: 'riskScore', label: 'RISK', field: 'riskScore', align: 'center' }
]

const revenueRecords = ref([
  {
    id: 'REV-2026-MAY-001',
    revenueType: 'TRANSACTION_FEE',
    tenant: 'Ahmadu Bello University',
    tenantType: 'SCHOOL',
    period: 'MAY-2026',
    txnCount: 425000,
    revenueAmount: 12500000,
    costAmount: 2500000,
    netRevenue: 10000000,
    margin: 80,
    growth: 14.2,
    riskScore: 5,
    anomalyScore: 0.02,
    fraudFlags: [],
    confidenceScore: 94
  },
  {
    id: 'REV-2026-MAY-002',
    revenueType: 'COMMISSION',
    tenant: 'Shoprite Mega Store',
    tenantType: 'RETAIL',
    period: 'MAY-2026',
    txnCount: 85400,
    revenueAmount: 8540000,
    costAmount: 1800000,
    netRevenue: 6740000,
    margin: 78,
    growth: -2.4,
    riskScore: 12,
    anomalyScore: 0.08,
    fraudFlags: [],
    confidenceScore: 88
  },
  {
    id: 'REV-2026-MAY-003',
    revenueType: 'TERMINAL_RENTAL',
    tenant: 'Invify Agency Network',
    tenantType: 'AGENT',
    period: 'MAY-2026',
    txnCount: 0,
    revenueAmount: 4500000,
    costAmount: 1200000,
    netRevenue: 3300000,
    margin: 73,
    growth: 5.5,
    riskScore: 8,
    anomalyScore: 0.04,
    fraudFlags: [],
    confidenceScore: 91
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
