<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16" style="height: calc(100vh - 50px); overflow-y: auto;">
    
    <!-- Header -->
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="dashboard" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-weight-bold" style="font-size: 16px;">INSTITUTE PORTAL</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">
            {{ identity.agentCode || (loading ? 'Loading…' : 'No Institute code') }}
            <template v-if="identity.status"> // {{ identity.status }}</template>
          </div>
        </div>
      </div>
      <div class="text-right text-caption text-muted" v-if="identity.name || identity.email">
        <div class="text-weight-bold text-main">{{ identity.name || '—' }}</div>
        <div>{{ identity.email }}</div>
        <div v-if="identity.phone">{{ identity.phone }}</div>
        <div v-if="identity.institution">{{ identity.institution }}</div>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="shrink-0">
      <q-tabs
        v-model="activeTab"
        dense
        scrollable
        outside-arrows
        mobile-arrows
        class="bg-panel text-muted rounded-borders border-muted"
        active-color="amber-4"
        indicator-color="amber-4"
        align="left"
        narrow-indicator
      >
        <q-tab name="overview" label="Overview" icon="dashboard" no-caps />
        <q-tab name="tenants" label="Tenants" icon="storefront" no-caps />
        <q-tab name="deployments" label="Deployments" icon="devices" no-caps />
        <q-tab name="finance" label="Finance" icon="account_balance_wallet" no-caps />
        <q-tab name="analytics" label="Analytics" icon="analytics" no-caps />
        <q-tab name="profile" label="Profile" icon="person" no-caps />
        <q-tab name="support" label="Support" icon="help" no-caps />
        <q-tab name="developer" label="Developer" icon="code" no-caps />
      </q-tabs>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-center col">
      <q-spinner color="amber-4" size="3em" />
    </div>

    <!-- Main Dashboard Panels -->
    <q-tab-panels v-else v-model="activeTab" animated class="bg-transparent col" style="overflow-y: auto;">
      
      <!-- OVERVIEW TAB -->
      <q-tab-panel name="overview" class="q-pa-none column op-gap-16">
        <!-- ROW 1: Performance KPIs -->
        <div class="row op-gap-16 shrink-0">
          <template v-for="kpi in kpiConfig" :key="kpi.key">
            <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md row items-center justify-between">
              <div>
                <div class="text-caption text-muted">{{ kpi.label }}</div>
                <div class="text-h5 text-weight-bold" :class="kpi.colorClass">
                  {{ formatNumber(payload.kpis?.[kpi.key]?.value, kpi.isCurrency) }}
                </div>
                <div class="text-metric-mono q-mt-xs" :class="getTrendColor(payload.kpis?.[kpi.key]?.trend)" style="font-size: 9px;">
                  {{ payload.kpis?.[kpi.key]?.trend }}
                </div>
              </div>
              <q-icon :name="kpi.icon" :color="kpi.iconColor" size="md" />
            </div>
          </template>
        </div>

        <div class="row op-gap-16 shrink-0">
          <div class="col-xs-12 col-sm-6 col-md panel-card bg-panel border-muted rounded-borders q-pa-md">
            <div class="text-caption text-muted">Total Tenants</div>
            <div class="text-h5 text-weight-bold">{{ payload.kpis?.totalTenants?.value ?? payload.kpis?.totalMerchants?.value ?? 0 }}</div>
          </div>
          <div class="col-xs-12 col-sm-6 col-md panel-card bg-panel border-muted rounded-borders q-pa-md">
            <div class="text-caption text-muted">Active Tenants</div>
            <div class="text-h5 text-weight-bold text-green-4">{{ payload.kpis?.activeTenants?.value || 0 }}</div>
          </div>
          <div class="col-xs-12 col-sm-6 col-md panel-card bg-panel border-muted rounded-borders q-pa-md">
            <div class="text-caption text-muted">Pending Onboarding</div>
            <div class="text-h5 text-weight-bold text-amber-4">{{ payload.kpis?.pendingOnboarding?.value || 0 }}</div>
          </div>
          <div class="col-xs-12 col-sm-6 col-md panel-card bg-panel border-muted rounded-borders q-pa-md">
            <div class="text-caption text-muted">Assessed Institute share (SHADOW)</div>
            <div class="text-h5 text-weight-bold text-amber-4">{{ formatKobo(payload.feeOrchestration?.assessed_kobo) }}</div>
            <div class="text-metric-mono text-muted" style="font-size: 9px;">NOT YET AVAILABLE</div>
          </div>
        </div>
        <div class="row op-gap-16 shrink-0">
          <!-- Quick Actions -->
          <div class="col-xs-12 col-md-8 row op-gap-16">
            <div 
              v-for="(action, index) in visibleQuickActions" 
              :key="index" 
              class="col panel-card bg-panel border-muted rounded-borders q-pa-md row items-center justify-center op-gap-8 cursor-pointer hover-card"
              @click="$router.push(action.route)"
            >
              <q-icon :name="action.icon" color="amber-4" size="sm" />
              <div class="text-weight-bold text-caption text-center" style="line-height: 1.2;">{{ action.label }}</div>
            </div>
          </div>

          <!-- Targets -->
          <div class="col-xs-12 col-md-4 bg-panel border-muted rounded-borders q-pa-md column justify-center">
            <div class="row justify-between q-mb-xs">
              <div class="text-caption text-muted">Monthly Target</div>
              <div class="text-metric-mono text-amber-4">{{ payload.targets?.percentage || 0 }}%</div>
            </div>
            <q-linear-progress :value="(payload.targets?.percentage || 0) / 100" color="amber-4" track-color="grey-9" class="q-mb-sm" size="10px" />
            <div class="row justify-between text-metric-mono" style="font-size: 10px;">
              <span>{{ payload.targets?.completed || 0 }} / {{ payload.targets?.monthlyTarget || 0 }} ONBOARDED</span>
              <span class="text-grey-6">{{ payload.targets?.remaining || 0 }} REMAINING</span>
            </div>
          </div>
        </div>

        <!-- ROW 3: Reputation Summary -->
        <div class="row op-gap-16 shrink-0 cursor-pointer hover-card" @click="$router.push('/institute/reputation')">
          <div class="col bg-panel border-muted rounded-borders q-pa-md row items-center justify-between">
            <div>
              <div class="text-caption text-muted text-uppercase text-weight-bold q-mb-xs">Trust Score</div>
              <div class="text-h4 text-weight-bold text-amber-4">{{ payload.reputation?.trust_score || 0 }}</div>
            </div>
            <div class="text-center">
              <div class="text-caption text-muted text-uppercase text-weight-bold q-mb-xs">Level</div>
              <div class="text-h6">{{ payload.reputation?.level_name || 'New Agent' }}</div>
            </div>
            <div class="text-right">
              <div class="text-caption text-muted text-uppercase text-weight-bold q-mb-xs">Global Rank</div>
              <div class="text-h4 text-weight-bold">#{{ payload.reputation?.rank || '-' }}</div>
            </div>
          </div>
        </div>

        <!-- ROW 4: Action Required & Alerts -->
        <div class="row op-gap-16 shrink-0">
          <!-- Tasks -->
          <div class="col bg-panel border-muted rounded-borders q-pa-md column">
            <div class="text-weight-bold q-mb-sm text-caption">ACTION REQUIRED</div>
            <div v-if="!payload.tasks?.length" class="text-muted text-caption">No pending tasks.</div>
            <div v-else class="column op-gap-8">
              <div v-for="task in payload.tasks" :key="task.id" class="bg-panel-darker q-pa-sm rounded-borders border-muted row items-center justify-between">
                <div class="row items-center op-gap-8">
                  <q-icon name="check_circle_outline" color="grey-6" />
                  <div>
                    <div class="text-weight-bold" style="font-size: 12px;">{{ task.title }}</div>
                    <div class="text-muted" style="font-size: 10px;">{{ task.text }}</div>
                  </div>
                </div>
                <q-btn dense flat color="amber-4" label="Execute" size="sm" @click="$q.notify({type: 'info', message: 'Task Execution Module coming soon.'})" />
              </div>
            </div>
          </div>

          <!-- Alerts -->
          <div class="col bg-panel border-muted rounded-borders q-pa-md column">
            <div class="text-weight-bold q-mb-sm text-caption">SYSTEM ALERTS</div>
            <div v-if="!payload.alerts?.length" class="text-muted text-caption">All systems optimal.</div>
            <div v-else class="column op-gap-8">
              <div v-for="alert in payload.alerts" :key="alert.id" class="bg-panel-darker q-pa-sm rounded-borders border-muted row items-center op-gap-8">
                <q-icon :name="alert.severity === 'Critical' ? 'error' : 'warning'" :color="alert.severity === 'Critical' ? 'red-4' : 'amber-4'" size="xs" />
                <div class="text-caption flex-1">{{ alert.text }}</div>
                <q-badge :color="alert.severity === 'Critical' ? 'red-9' : 'amber-9'" :text-color="alert.severity === 'Critical' ? 'red-3' : 'amber-3'">{{ alert.severity }}</q-badge>
              </div>
            </div>
          </div>
        </div>
      </q-tab-panel>

      <!-- TENANTS TAB -->
      <q-tab-panel name="tenants" class="q-pa-none column op-gap-16">
        <!-- Actions & Territory/Portfolio Summary -->
        <div class="row op-gap-16 shrink-0">
          <!-- Quick Actions -->
          <div class="col-xs-12 col-md-4 bg-panel border-muted rounded-borders q-pa-md column justify-between">
            <div class="text-weight-bold q-mb-sm text-caption">QUICK ACTIONS</div>
            <div class="column op-gap-8">
              <q-btn color="amber-4" text-color="black" icon="person_add" label="Create Lead" class="full-width" no-caps @click="$router.push('/institute/leads')" />
              <q-btn outline color="grey-4" icon="upload_file" label="Upload KYC Documents" class="full-width" no-caps @click="kycModal.open()" />
            </div>
            <div class="text-caption text-muted q-mt-sm">Tenant registration is on the Invify mobile app. Assigned tenants show in this portfolio.</div>
          </div>

          <!-- Territory Summary -->
          <div class="col bg-panel border-muted rounded-borders q-pa-md column">
            <div class="row items-center op-gap-8 q-mb-sm">
              <q-icon name="map" color="purple-4" />
              <div class="text-weight-bold text-caption">TERRITORY SUMMARY</div>
            </div>
            <div class="text-h6 text-purple-2 q-mb-sm">{{ payload.territory?.name || agentInfo?.territory || 'Default' }}</div>
            <div class="row justify-between border-bottom-light q-pb-xs q-mb-xs">
              <span class="text-caption text-muted">Total Tenants</span>
              <span class="text-weight-bold">{{ payload.territory?.merchants || 0 }}</span>
            </div>
            <div class="row justify-between border-bottom-light q-pb-xs q-mb-xs">
              <span class="text-caption text-muted">Active Tenants</span>
              <span class="text-weight-bold text-green-4">{{ payload.territory?.active || 0 }}</span>
            </div>
            <div class="row justify-between">
              <span class="text-caption text-muted">Pending Tenants</span>
              <span class="text-weight-bold text-amber-4">{{ payload.territory?.pending || 0 }}</span>
            </div>
          </div>

          <!-- Portfolio Health -->
          <div class="col bg-panel border-muted rounded-borders q-pa-md column justify-center">
            <div class="text-weight-bold text-caption q-mb-sm">PORTFOLIO HEALTH</div>
            <div class="row justify-between q-mb-xs">
              <span class="text-caption text-muted"><q-icon name="circle" color="green-4" size="8px" class="q-mr-sm"/>Healthy</span>
              <span class="text-weight-bold">{{ payload.portfolioHealth?.healthy || 0 }}</span>
            </div>
            <div class="row justify-between q-mb-xs">
              <span class="text-caption text-muted"><q-icon name="circle" color="amber-4" size="8px" class="q-mr-sm"/>Attention Req</span>
              <span class="text-weight-bold text-amber-4">{{ payload.portfolioHealth?.attentionRequired || 0 }}</span>
            </div>
            <div class="row justify-between">
              <span class="text-caption text-muted"><q-icon name="circle" color="red-4" size="8px" class="q-mr-sm"/>Dormant</span>
              <span class="text-weight-bold text-red-4">{{ payload.portfolioHealth?.dormant || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Pipeline Visualizer -->
        <div class="bg-panel border-muted rounded-borders q-pa-md column shrink-0">
          <div class="text-weight-bold q-mb-sm text-caption">MERCHANT PIPELINE</div>
          <div class="row items-center justify-between q-px-sm">
            <div class="column flex-center text-blue-4">
              <q-icon name="person_search" size="sm" />
              <div class="text-h6 text-weight-bold">{{ payload.pipeline?.prospects || 0 }}</div>
              <div class="text-metric-mono" style="font-size: 9px;">PROSPECT</div>
            </div>
            <q-icon name="arrow_right_alt" color="grey-8" />
            
            <div class="column flex-center text-orange-4">
              <q-icon name="phone_in_talk" size="sm" />
              <div class="text-h6 text-weight-bold">{{ payload.pipeline?.contacted || 0 }}</div>
              <div class="text-metric-mono" style="font-size: 9px;">CONTACTED</div>
            </div>
            <q-icon name="arrow_right_alt" color="grey-8" />
            
            <div class="column flex-center text-yellow-4">
              <q-icon name="fact_check" size="sm" />
              <div class="text-h6 text-weight-bold">{{ payload.pipeline?.kycSubmitted || 0 }}</div>
              <div class="text-metric-mono" style="font-size: 9px;">KYC SUBMITTED</div>
            </div>
            <q-icon name="arrow_right_alt" color="grey-8" />
            
            <div class="column flex-center text-green-4">
              <q-icon name="thumb_up" size="sm" />
              <div class="text-h6 text-weight-bold">{{ payload.pipeline?.approved || 0 }}</div>
              <div class="text-metric-mono" style="font-size: 9px;">APPROVED</div>
            </div>
            <q-icon name="arrow_right_alt" color="grey-8" />
            
            <div class="column flex-center text-green-13">
              <q-icon name="check_circle" size="sm" />
              <div class="text-h6 text-weight-bold">{{ payload.pipeline?.activated || 0 }}</div>
              <div class="text-metric-mono" style="font-size: 9px;">ACTIVATED</div>
            </div>
          </div>
        </div>

        <!-- Recent Tenants Table -->
        <div class="bg-panel border-muted rounded-borders column overflow-hidden" style="max-height: 300px;">
          <div class="bg-panel-darker q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0">
            <span class="text-weight-bold text-caption">RECENT TENANTS</span>
            <q-btn dense flat color="amber-4" label="View All" size="sm" @click="$router.push('/institute/portfolio')" />
          </div>
          <div v-if="!payload.recentMerchants?.length" class="flex flex-center col text-muted q-pa-md">
            No tenants assigned to {{ identity.agentCode || 'this Institute' }} yet.
          </div>
          <div v-else class="col overflow-auto custom-scrollbar">
            <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
              <thead class="bg-panel-darker text-muted text-metric-mono sticky-header" style="font-size: 10px;">
                <tr>
                  <th class="q-pa-sm border-bottom">Tenant</th>
                  <th class="q-pa-sm border-bottom">Agent Code</th>
                  <th class="q-pa-sm border-bottom">KYC</th>
                  <th class="q-pa-sm border-bottom">Device</th>
                  <th class="q-pa-sm border-bottom">Action</th>
                </tr>
              </thead>
              <tbody class="text-caption" style="font-size: 12px;">
                <tr v-for="m in payload.recentMerchants" :key="m.id" class="border-bottom-light hover-row">
                  <td class="q-pa-sm text-weight-bold">{{ m.business_name || 'Unknown' }}</td>
                  <td class="q-pa-sm text-metric-mono text-muted">{{ m.agent_code || payload.identity?.agent_code || '—' }}</td>
                  <td class="q-pa-sm">
                    <q-badge :color="m.status === 'ACTIVE' ? 'green-9' : 'amber-9'" :text-color="m.status === 'ACTIVE' ? 'green-3' : 'amber-3'">{{ m.status }}</q-badge>
                  </td>
                  <td class="q-pa-sm text-muted">Pending</td>
                  <td class="q-pa-sm">
                    <q-btn dense flat color="amber-4" icon="upload_file" size="sm" @click="kycModal.open()">
                      <q-tooltip>Upload KYC</q-tooltip>
                    </q-btn>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </q-tab-panel>

      <!-- DEPLOYMENTS TAB -->
      <q-tab-panel name="deployments" class="q-pa-none column op-gap-16">
        <!-- Actions & Device/Terminal Health -->
        <div class="row op-gap-16 shrink-0">
          <!-- Deployment Actions -->
          <div class="col-xs-12 col-md-4 bg-panel border-muted rounded-borders q-pa-md column justify-between">
            <div class="text-weight-bold q-mb-sm text-caption">DEPLOYMENT ACTIONS</div>
            <div class="column op-gap-8">
              <q-btn color="amber-4" text-color="black" icon="add_to_queue" label="Assign Device" class="full-width" no-caps @click="hardwareModal.open('DEVICE')" />
              <q-btn outline color="amber-4" icon="point_of_sale" label="Assign Terminal" class="full-width" no-caps @click="hardwareModal.open('TERMINAL')" />
              <q-btn outline color="grey-4" icon="sync" label="Sync Device" class="full-width" no-caps @click="syncDevice()" />
            </div>
          </div>

          <!-- Device Health -->
          <div class="col bg-panel border-muted rounded-borders q-pa-md column">
            <div class="row justify-between items-center q-mb-sm">
              <div class="text-weight-bold text-caption">DEVICE HEALTH</div>
              <q-badge color="cyan-9" text-color="cyan-3">{{ payload.deployments?.devices?.activationRate || 0 }}% ACTIVATION</q-badge>
            </div>
            <div class="row op-gap-8 text-center flex-1 items-center">
              <div class="col bg-panel-darker q-pa-sm rounded-borders">
                <div class="text-h6">{{ payload.deployments?.devices?.assigned || 0 }}</div>
                <div class="text-metric-mono text-muted" style="font-size: 9px;">ASSIGNED</div>
              </div>
              <div class="col bg-panel-darker q-pa-sm rounded-borders">
                <div class="text-h6 text-green-4">{{ payload.deployments?.devices?.activated || 0 }}</div>
                <div class="text-metric-mono text-muted" style="font-size: 9px;">ACTIVATED</div>
              </div>
              <div class="col bg-panel-darker q-pa-sm rounded-borders">
                <div class="text-h6 text-amber-4">{{ payload.deployments?.devices?.pending || 0 }}</div>
                <div class="text-metric-mono text-muted" style="font-size: 9px;">PENDING</div>
              </div>
              <div class="col bg-panel-darker q-pa-sm rounded-borders">
                <div class="text-h6 text-red-4">{{ payload.deployments?.devices?.offline || 0 }}</div>
                <div class="text-metric-mono text-muted" style="font-size: 9px;">OFFLINE</div>
              </div>
            </div>
          </div>

          <!-- Terminal Health -->
          <div class="col bg-panel border-muted rounded-borders q-pa-md column">
            <div class="row justify-between items-center q-mb-sm">
              <div class="text-weight-bold text-caption">TERMINAL HEALTH</div>
              <q-badge color="purple-9" text-color="purple-3">{{ payload.deployments?.terminals?.syncSuccessRate || 0 }}% SYNC</q-badge>
            </div>
            <div class="row op-gap-8 text-center flex-1 items-center">
              <div class="col bg-panel-darker q-pa-sm rounded-borders">
                <div class="text-h6 text-green-4">{{ payload.deployments?.terminals?.activated || 0 }}</div>
                <div class="text-metric-mono text-muted" style="font-size: 9px;">ACTIVATED</div>
              </div>
              <div class="col bg-panel-darker q-pa-sm rounded-borders">
                <div class="text-h6 text-red-4">{{ payload.deployments?.terminals?.offline || 0 }}</div>
                <div class="text-metric-mono text-muted" style="font-size: 9px;">OFFLINE</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Activation Funnel Chart -->
        <div class="bg-panel border-muted rounded-borders q-pa-md column shrink-0">
          <div class="text-weight-bold text-caption q-mb-sm">ACTIVATION FUNNEL</div>
          <div v-if="!payload.analytics?.activationFunnel?.some(v => v > 0)" class="flex flex-center text-center column text-muted q-py-lg">
            <q-icon name="filter_alt" size="xl" class="q-mb-sm" color="grey-8"/>
            No activation funnel data.
          </div>
          <apexchart v-else type="bar" height="180" :options="funnelChartOptions" :series="funnelSeries" />
        </div>
      </q-tab-panel>

      <!-- FINANCE TAB -->
      <q-tab-panel name="finance" class="q-pa-none column op-gap-16">
        <div class="bg-panel-darker border-muted rounded-borders q-pa-sm text-caption text-amber-4">
          Fee orchestration is in SHADOW mode. The Institute share of each transaction fee is assessed as a pending payable, not withdrawable cash. Payouts are disabled.
        </div>
        <div class="row op-gap-16 shrink-0">
          <div class="col-xs-12 col-sm bg-panel border-muted rounded-borders q-pa-md">
            <div class="text-caption text-muted">Assessed Institute share</div>
            <div class="text-h5 text-weight-bold text-amber-4">{{ formatKobo(payload.feeOrchestration?.assessed_kobo) }}</div>
          </div>
          <div class="col-xs-12 col-sm bg-panel border-muted rounded-borders q-pa-md">
            <div class="text-caption text-muted">Pending Payable</div>
            <div class="text-h5 text-weight-bold">{{ formatKobo(payload.feeOrchestration?.pending_payable_kobo) }}</div>
          </div>
          <div class="col-xs-12 col-sm bg-panel border-muted rounded-borders q-pa-md">
            <div class="text-caption text-muted">Not Yet Available</div>
            <div class="text-h5 text-weight-bold text-grey-5">{{ formatKobo(payload.feeOrchestration?.available_kobo) }}</div>
          </div>
        </div>
        <!-- Balance Summaries & Link to Full Module -->
        <div class="row op-gap-16 shrink-0">
          <div class="col bg-panel border-muted rounded-borders q-pa-md row justify-between items-center">
            <div>
              <div class="text-caption text-muted">Legacy Wallet Available</div>
              <div class="text-h4 text-weight-bold text-green-4">{{ formatMoney(payload.wallet?.summary?.availableBalance) }}</div>
            </div>
            <q-icon name="account_balance_wallet" size="lg" color="green-4" />
          </div>

          <div class="col bg-panel border-muted rounded-borders q-pa-md row justify-between items-center">
            <div>
              <div class="text-caption text-muted">Pending Earnings</div>
              <div class="text-h4 text-weight-bold text-amber-4">{{ formatMoney(payload.wallet?.summary?.pendingBalance) }}</div>
            </div>
            <q-icon name="pending_actions" size="lg" color="amber-4" />
          </div>

          <div class="col bg-panel border-muted rounded-borders q-pa-md column justify-center items-center op-gap-8">
            <div class="text-caption text-muted">Wallet Center</div>
            <q-btn color="amber-4" text-color="black" icon="open_in_new" label="Open Wallet Center" class="full-width" no-caps @click="$router.push('/institute/wallet')" />
          </div>
        </div>

        <!-- Recent Commissions & Recent Withdrawals -->
        <div class="row op-gap-16 shrink-0">
          <!-- Recent Commissions -->
          <div class="col bg-panel border-muted rounded-borders column overflow-hidden" style="max-height: 300px;">
            <div class="bg-panel-darker q-px-sm q-py-xs border-bottom row items-center shrink-0">
              <span class="text-weight-bold text-caption text-muted">RECENT INSTITUTE FEE SHARES</span>
            </div>
            <div v-if="!payload.wallet?.recentCommissions?.length && !payload.feeOrchestration?.recent?.length" class="flex flex-center col text-muted text-caption q-pa-md">No Institute fee shares recorded yet. Shares appear after tenants transact.</div>
            <div v-else class="col overflow-auto custom-scrollbar">
              <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
                <thead class="bg-panel-darker text-muted text-metric-mono sticky-header" style="font-size: 10px;">
                  <tr>
                    <th class="q-pa-sm">Date</th>
                    <th class="q-pa-sm">Tenant</th>
                    <th class="q-pa-sm">Type</th>
                    <th class="q-pa-sm">Fee</th>
                    <th class="q-pa-sm">Institute Share</th>
                    <th class="q-pa-sm">Status</th>
                    <th class="q-pa-sm">Mode</th>
                  </tr>
                </thead>
                <tbody class="text-caption" style="font-size: 12px;">
                  <tr v-for="c in (payload.feeOrchestration?.recent || payload.wallet?.recentCommissions || [])" :key="c.assessment_id || c.id" class="border-bottom-light hover-row">
                    <td class="q-pa-sm text-muted">{{ c.date ? new Date(c.date).toLocaleDateString() : '—' }}</td>
                    <td class="q-pa-sm text-metric-mono">{{ c.tenant_id || '—' }}</td>
                    <td class="q-pa-sm">{{ c.transaction_type || c.type || 'AGENT_FEE' }}</td>
                    <td class="q-pa-sm">{{ c.fee_amount_kobo != null ? formatKobo(c.fee_amount_kobo) : '—' }}</td>
                    <td class="q-pa-sm text-weight-bold text-green-4">{{ c.agent_share_kobo != null ? formatKobo(c.agent_share_kobo) : formatMoney(c.amount) }}</td>
                    <td class="q-pa-sm">
                      <q-badge color="amber-9" text-color="amber-3">{{ c.status || 'PENDING' }}</q-badge>
                    </td>
                    <td class="q-pa-sm">{{ c.mode || 'SHADOW' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Recent Withdrawals -->
          <div class="col bg-panel border-muted rounded-borders column overflow-hidden" style="max-height: 300px;">
            <div class="bg-panel-darker q-px-sm q-py-xs border-bottom row items-center shrink-0">
              <span class="text-weight-bold text-caption text-muted">RECENT WITHDRAWALS</span>
            </div>
            <div v-if="!payload.wallet?.recentWithdrawals?.length" class="flex flex-center col text-muted text-caption q-pa-md">No recent withdrawals.</div>
            <div v-else class="col overflow-auto custom-scrollbar">
              <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
                <tbody class="text-caption" style="font-size: 12px;">
                  <tr v-for="w in (payload.wallet?.recentWithdrawals || [])" :key="w.id" class="border-bottom-light hover-row">
                    <td class="q-pa-sm text-muted">{{ new Date(w.created_at).toLocaleDateString() }}</td>
                    <td class="q-pa-sm text-weight-bold text-red-4">-{{ formatMoney(w.amount) }}</td>
                    <td class="q-pa-sm text-right">
                      <q-badge :color="w.status === 'COMPLETED' ? 'green-9' : 'amber-9'">{{ w.status }}</q-badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </q-tab-panel>

      <!-- ANALYTICS TAB -->
      <q-tab-panel name="analytics" class="q-pa-none column flex-center op-gap-16">
        <div class="text-center column flex-center q-pa-xl">
          <q-icon name="insights" size="4rem" color="blue-4" class="q-mb-md" />
          <div class="text-h6 text-weight-bold">Intelligence & Analytics Center</div>
          <div class="text-caption text-muted q-mt-sm q-mb-lg" style="max-width: 320px;">
            Access full performance tracking, territory intelligence, operational risk signals, and gamification trends powered by our new fast-sync engine.
          </div>
          <q-btn color="blue-4" text-color="black" label="Open Analytics Center" icon="open_in_new" no-caps @click="$router.push('/institute/analytics')" />
        </div>
      </q-tab-panel>

      <!-- PROFILE TAB -->
      <q-tab-panel name="profile" class="q-pa-none column flex-center op-gap-16">
        <div class="panel-card bg-panel border-muted rounded-borders q-pa-lg column items-center text-center op-gap-16" style="width: 100%; max-width: 460px;">
          <q-avatar size="100px" color="amber-9" text-color="amber-2" class="border-muted shadow-2">
            <img v-if="identity.photo" :src="identity.photo" />
            <span v-else>{{ identity.initials }}</span>
          </q-avatar>
          <div>
            <div class="text-h5 text-weight-bold">{{ identity.name || '—' }}</div>
            <div class="text-metric-mono text-muted">{{ identity.agentCode || '—' }}</div>
          </div>

          <q-separator dark class="full-width opacity-10" />

          <div class="full-width column op-gap-8 text-left q-px-md">
            <div class="row justify-between">
              <span class="text-muted text-caption">Email:</span>
              <span class="text-weight-bold">{{ identity.email || '—' }}</span>
            </div>
            <div class="row justify-between">
              <span class="text-muted text-caption">Phone:</span>
              <span class="text-weight-bold">{{ identity.phone || '—' }}</span>
            </div>
            <div class="row justify-between">
              <span class="text-muted text-caption">Status:</span>
              <span class="text-weight-bold">{{ identity.status || '—' }}</span>
            </div>
            <div class="row justify-between">
              <span class="text-muted text-caption">Joined:</span>
              <span class="text-weight-bold">{{ identity.joinedLabel }}</span>
            </div>
            <div class="row justify-between">
              <span class="text-muted text-caption">Territory:</span>
              <span class="text-weight-bold">{{ identity.territory || '—' }}</span>
            </div>
            <div class="row justify-between">
              <span class="text-muted text-caption">KYC Status:</span>
              <q-badge v-if="identity.kyc" :color="identity.kyc === 'VERIFIED' ? 'green-9' : 'amber-9'">
                {{ identity.kyc }}
              </q-badge>
              <span v-else class="text-weight-bold">—</span>
            </div>
            <div class="row justify-between">
              <span class="text-muted text-caption">2FA Status:</span>
              <q-badge :color="identity.mfa ? 'green-9' : 'grey-9'">
                {{ identity.mfa ? 'ENABLED' : 'DISABLED' }}
              </q-badge>
            </div>
          </div>

          <q-separator dark class="full-width opacity-10" />

          <div class="column full-width op-gap-8">
            <q-btn
              v-if="!identity.mfa"
              color="amber-4"
              text-color="black"
              icon="phonelink_lock"
              label="Enable 2FA"
              class="full-width"
              no-caps
              :loading="mfaBusy"
              @click="startMfaSetup"
            />
            <q-btn
              v-else
              outline
              color="green-4"
              icon="verified_user"
              label="2FA Enabled"
              class="full-width"
              no-caps
              disable
            />
            <q-btn color="amber-4" text-color="black" label="Open Full Profile" class="full-width" no-caps @click="$router.push('/institute/profile')" />
            <q-btn outline color="amber-4" label="Open Security Center" class="full-width" no-caps @click="$router.push({ path: '/institute/profile', query: { tab: 'security' } })" />
          </div>
        </div>
      </q-tab-panel>

      <!-- SUPPORT TAB -->
      <q-tab-panel name="support" class="q-pa-none column flex-center op-gap-16">
        <div class="text-center column flex-center q-pa-xl">
          <q-icon name="contact_support" size="4rem" color="grey-6" class="q-mb-md" />
          <div class="text-h6 text-weight-bold">Support Center (Phase 4)</div>
          <div class="text-caption text-muted q-mt-sm" style="max-width: 320px;">
            The agent support ticketer and workforce management communication lines will be online during the next release deployment cycle.
          </div>
        </div>
      </q-tab-panel>

      <!-- DEVELOPER TAB -->
      <q-tab-panel name="developer" class="q-pa-none column flex-center op-gap-16">
        <div class="text-center column flex-center q-pa-xl">
          <q-icon name="code" size="4rem" color="amber-4" class="q-mb-md" />
          <div class="text-h6 text-weight-bold">Developer & Webhooks</div>
          <div class="text-caption text-muted q-mt-sm q-mb-lg" style="max-width: 360px;">
            Configure your webhook URL, verify Invify signatures, and manage API credentials. Test events do not affect your balance.
          </div>
          <q-btn color="amber-4" text-color="black" label="Open Developer Center" icon="open_in_new" no-caps @click="$router.push('/institute/developer')" />
        </div>
      </q-tab-panel>

    </q-tab-panels>
    
    <AgentKYCUploadModal ref="kycModal" />
    <AgentHardwareAssignmentModal ref="hardwareModal" />

    <q-dialog v-model="showMfaModal" persistent>
      <q-card class="bg-panel text-main" style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Enable 2FA</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="column flex-center op-gap-16 q-pt-md">
          <div class="bg-white q-pa-sm rounded-borders">
            <qrcode-vue v-if="mfaSetupData.qrCodeUri" :value="mfaSetupData.qrCodeUri" :size="200" level="M" />
          </div>
          <div class="text-caption text-center text-muted">
            Scan this QR code with Google Authenticator or Authy, then enter the 6-digit code.
          </div>
          <div class="text-metric-mono text-amber-4 text-center">
            Secret: {{ mfaSetupData.secret }}
          </div>
          <q-input dark outlined v-model="mfaVerifyCode" label="Enter 6-digit Code" color="amber-4" class="full-width" maxlength="6" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="white" v-close-popup />
          <q-btn label="Verify & Enable" color="amber-4" text-color="black" @click="verifyMfaSetup" :loading="mfaBusy" :disable="!mfaVerifyCode || mfaVerifyCode.length < 6" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'
import QrcodeVue from 'qrcode.vue'
import AgentKYCUploadModal from './components/AgentKYCUploadModal.vue'
import AgentHardwareAssignmentModal from './components/AgentHardwareAssignmentModal.vue'
import { pickInstituteCode } from '../../utils/instituteIdentity'

const $q = useQuasar()
const router = useRouter()
const apexchart = VueApexCharts
const kycModal = ref(null)
const hardwareModal = ref(null)
const loading = ref(true)
const mfaBusy = ref(false)
const showMfaModal = ref(false)
const mfaSetupData = ref({})
const mfaVerifyCode = ref('')
const agentInfo = ref(null)
const payload = ref({})
const activeTab = ref('overview')
const visibleQuickActions = computed(() =>
  (payload.value.quickActions || []).filter((action) => {
    const label = String(action.label || '').toLowerCase()
    const route = String(action.route || '').toLowerCase()
    return !label.includes('register merchant') && !route.includes('register-merchant')
  }),
)

function parseStoredAgent() {
  try {
    return JSON.parse(localStorage.getItem('invify_agent_info') || 'null')
  } catch {
    return null
  }
}

function agentAuthHeaders() {
  const token = localStorage.getItem('invify_agent_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const identity = computed(() => {
  const p = payload.value?.identity || {}
  const a = agentInfo.value || {}
  const s = parseStoredAgent() || {}
  const composed = `${a.first_name || s.first_name || ''} ${a.last_name || s.last_name || ''}`.trim()
  const email = p.email || a.email || s.email || ''
  const name = p.name || a.name || s.name || composed || (email ? email.split('@')[0] : '')
  const parts = String(name || '').split(/\s+/).filter(Boolean)
  const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase() || '?'
  const joinedRaw = p.date_joined || a.created_at || s.created_at
  return {
    name,
    email,
    phone: p.phone || a.phone || a.phone_number || s.phone || '',
    agentCode: pickInstituteCode(p.agent_code, a.agent_code, a.agentCode, s.agentCode, s.agent_code),
    status: p.status || a.status || s.status || '',
    institution: p.institution || '',
    territory: a.territory || p.territory || '',
    kyc: a.profile?.kyc_status || a.kyc_status || a.kycStatus || p.kyc_status || '',
    mfa: Boolean(a.profile?.mfa_enabled || s.profile?.mfa_enabled),
    photo: a.profile?.photo_url || a.profile?.profile_photo_url || a.passportImage || null,
    initials,
    joinedLabel: joinedRaw ? new Date(joinedRaw).toLocaleDateString() : '—',
  }
})

const formatMoney = (num) => {
  const value = Number(num || 0)
  return `₦${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatNumber = (num, isCurrency) => {
  if (num === undefined || num === null) return isCurrency ? '₦0.00' : '0'
  return isCurrency ? formatMoney(num) : Number(num).toLocaleString()
}
const formatKobo = (kobo) => {
  const naira = Number(kobo || 0) / 100
  return `₦${naira.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const getTrendColor = (trend) => {
  if (!trend) return 'text-muted'
  if (trend.includes('↑')) return 'text-green-4'
  if (trend.includes('↓')) return 'text-red-4'
  if (trend === 'New Metric') return 'text-blue-4'
  return 'text-muted'
}

const kpiConfig = [
  { key: 'totalMerchants', label: 'Total Tenants', icon: 'storefront', iconColor: 'grey-6', isCurrency: false, colorClass: 'text-main' },
  { key: 'thisMonth', label: 'This Month', icon: 'event', iconColor: 'amber-4', isCurrency: false, colorClass: 'text-amber-4' },
  { key: 'activeDevices', label: 'Active Devices', icon: 'devices', iconColor: 'cyan-4', isCurrency: false, colorClass: 'text-cyan-4' },
  { key: 'activeTerminals', label: 'Active Terminals', icon: 'point_of_sale', iconColor: 'purple-4', isCurrency: false, colorClass: 'text-purple-4' },
  { key: 'earnedCommissions', label: 'Earned Commissions', icon: 'account_balance_wallet', iconColor: 'green-4', isCurrency: true, colorClass: 'text-green-4' }
]

const syncDevice = async () => {
  try {
    loading.value = true
    await api.post('/agent/hardware/sync')
    $q.notify({ type: 'positive', message: 'Hardware sync initiated successfully' })
    await fetchDashboardData()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to sync hardware' })
  } finally {
    loading.value = false
  }
}

const startMfaSetup = async () => {
  mfaBusy.value = true
  try {
    const res = await axios.post('/api/agent/security/mfa/enable', {}, { headers: agentAuthHeaders() })
    mfaSetupData.value = res.data || {}
    mfaVerifyCode.value = ''
    showMfaModal.value = true
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.message || 'Could not start 2FA setup',
    })
  } finally {
    mfaBusy.value = false
  }
}

const verifyMfaSetup = async () => {
  mfaBusy.value = true
  try {
    await axios.post('/api/agent/security/mfa/verify', { code: mfaVerifyCode.value }, { headers: agentAuthHeaders() })
    const next = {
      ...(agentInfo.value || {}),
      profile: { ...(agentInfo.value?.profile || {}), mfa_enabled: true },
    }
    agentInfo.value = next
    localStorage.setItem('invify_agent_info', JSON.stringify(next))
    showMfaModal.value = false
    $q.notify({ type: 'positive', message: '2FA is enabled on this Institute account' })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.message || 'Invalid 2FA code',
    })
  } finally {
    mfaBusy.value = false
  }
}

const fetchDashboardData = async () => {
  loading.value = true
  agentInfo.value = parseStoredAgent()
  try {
    const token = localStorage.getItem('invify_agent_token')
    if (!token) {
      $q.notify({ type: 'negative', message: 'Not authenticated. Please log in.' })
      router.push('/institute/login')
      return
    }

    const headers = agentAuthHeaders()
    const [profileRes, dashRes] = await Promise.allSettled([
      axios.get('/api/agent/profile', { headers }),
      axios.get('/api/agent/dashboard', { headers }),
    ])

    if (dashRes.status === 'fulfilled' && dashRes.value.data?.identity) {
      payload.value = dashRes.value.data
    } else if (dashRes.status === 'rejected') {
      const err = dashRes.reason
      $q.notify({
        type: 'negative',
        message: err?.response?.data?.message || err?.response?.data?.error || 'Failed to load dashboard data',
        position: 'top-right',
      })
    }

    const live = { ...(agentInfo.value || {}) }
    if (profileRes.status === 'fulfilled' && profileRes.value.data?.data) {
      Object.assign(live, profileRes.value.data.data)
    }
    const code = pickInstituteCode(
      payload.value?.identity?.agent_code,
      live.agent_code,
      live.agentCode,
    )
    if (code) {
      live.agent_code = code
      live.agentCode = code
    }
    agentInfo.value = live
    if (Object.keys(live).length) {
      localStorage.setItem('invify_agent_info', JSON.stringify(live))
    }
  } catch (err) {
    console.error('Dashboard fetch failed', err)
    $q.notify({ type: 'negative', message: 'Failed to load dashboard data', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboardData)

// Chart Series
const growthSeries = computed(() => [{ name: 'Tenants', data: payload.value.analytics?.merchantGrowth || [] }])
const commissionSeries = computed(() => [{ name: 'Commission', data: payload.value.analytics?.commissionTrend || [] }])
const funnelSeries = computed(() => [{ name: 'Conversion', data: payload.value.analytics?.activationFunnel || [] }])

// Chart Options
const baseOptions = {
  chart: { toolbar: { show: false }, background: 'transparent', sparkline: { enabled: true } },
  theme: { mode: 'dark' },
  grid: { show: false },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark' }
}
const growthChartOptions = { ...baseOptions, stroke: { curve: 'smooth', width: 2 }, colors: ['#fcc419'], fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.0, stops: [0, 100] } } }
const commissionChartOptions = { ...baseOptions, plotOptions: { bar: { borderRadius: 2 } }, colors: ['#40c057'] }
const funnelChartOptions = { ...baseOptions, plotOptions: { bar: { borderRadius: 2, horizontal: true } }, colors: ['#74c0fc', '#ffa94d', '#ffe066', '#8ce99a'] }

</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.border-bottom-light { border-bottom: 1px solid #1a2024; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }

.hover-card { transition: transform 0.2s, border-color 0.2s; }
.hover-card:hover { border-color: #fcc419; transform: translateY(-2px); }
.hover-row:hover { background-color: #1a2327 !important; }

.sticky-header { position: sticky; top: 0; z-index: 2; }
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #0b0f12; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #22282d; border-radius: 3px; }
</style>
