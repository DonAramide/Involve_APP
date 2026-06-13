<template>
  <q-page class="q-pa-md text-main dark-page bg-dark-main">

    <!-- ── Header & Switch Health ─────────────────────────────────── -->
    <div class="row items-center q-mb-md border-bottom-pulse">
      <div class="col-12 col-md">
        <div class="text-h4 text-weight-bold text-glow text-purple-3">
          <q-icon name="hub" size="lg" class="q-mr-sm" />POS Switch Board
        </div>
        <div class="text-caption text-secondary font-sans letter-spacing-1">
          Processor-Grade Routing Governance, SLA Governance &amp; Key Distribution
        </div>
      </div>
      <div class="col-12 col-md-auto row q-gutter-sm items-center justify-end q-mt-sm-only">
        <!-- Live Status Badge -->
        <q-chip dense square color="purple-10" text-color="purple-3" class="text-weight-bold font-mono text-caption">
          SWITCH STATE: AUTHORITATIVE
        </q-chip>
        <q-btn unelevated color="purple-8" icon="refresh" label="Reload Switchboard" @click="loadAll" :loading="loading" :dark="prefs.isDarkMode" class="animate-pulse" />
      </div>
    </div>

    <!-- ── Overview KPI Cards ────────────────────────────────────── -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3" v-for="kpi in kpiCards" :key="kpi.label">
        <q-card class="bg-panel border-main animate-hover" flat :dark="prefs.isDarkMode">
          <q-card-section class="q-pa-md">
            <div class="row items-center justify-between q-mb-xs">
              <div class="text-caption text-secondary text-weight-bold">{{ kpi.label }}</div>
              <q-icon :name="kpi.icon" :color="kpi.color" size="1.4em" />
            </div>
            <div class="text-h5 text-weight-bold font-mono" :style="`color:${kpi.valueColor}`">{{ kpi.value }}</div>
            <div class="text-caption text-secondary font-sans q-mt-xs">{{ kpi.sub }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ── Tabs ────────────────────────────────────────────────────── -->
    <q-tabs
      v-model="activeTab"
      dense align="left"
      active-color="purple-3"
      indicator-color="purple-3"
      class="text-grey-5 q-mb-md tab-bar border-main"
      :dark="prefs.isDarkMode"
    >
      <q-tab name="hosts"         icon="lan"            label="Processor Hosts" />
      <q-tab name="matrix"        icon="grid_on"        label="Rules Matrix" />
      <q-tab name="profiles"      icon="supervised_user_circle" label="Tenant Profiles" />
      <q-tab name="simulation"    icon="psychology"     label="Route Simulator" />
      <q-tab name="observability" icon="insights"       label="SLA Observability" />
      <q-tab name="transactions"  icon="receipt_long"   label="Live ISO8583 Log" />
      <q-tab name="audits"        icon="history"        label="Audit Trail" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated keep-alive class="bg-transparent text-main">

      <!-- ════════════════════════════════════════════════════════════
           TAB 1 — PROCESSOR HOSTS
           ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="hosts" class="q-pa-none">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-3" v-for="h in hostDefs" :key="h.key">
            <q-card class="bg-panel border-main cursor-pointer animate-hover relative-position" flat :dark="prefs.isDarkMode"
              @click="openHostDrawer(h.key)"
              :style="getHostConfig(h.key)?.isActive ? `border-color:${h.glowColor};box-shadow:0 0 12px ${h.glowColor}15` : ''">
              
              <!-- Active Route Indicator -->
              <div v-if="config.activeHost === h.key" class="active-ribbon" :style="`background-color:${h.glowColor}`">
                ACTIVE
              </div>
              <div v-else class="active-ribbon" style="background-color:transparent; right:4px; top:4px;">
                <q-btn flat dense size="xs" color="grey-5" label="Set Active" @click.stop="setActiveHost(h.key)" :dark="prefs.isDarkMode" />
              </div>

              <q-card-section class="q-pa-md">
                <div class="row items-center q-mb-md">
                  <q-icon :name="h.icon" :color="h.color" size="1.8em" class="q-mr-sm" />
                  <div class="col">
                    <div class="text-subtitle1 text-weight-bold text-white">{{ h.label }}</div>
                    <div class="text-caption text-secondary">{{ h.proto }}</div>
                  </div>
                </div>

                <div class="row items-center justify-between q-mb-sm">
                  <span class="text-caption text-secondary">Connection Endpoint</span>
                  <span class="font-mono text-caption text-white text-weight-bold">
                    {{ h.key === 'kimono' ? 'connectpoint.app' : `${getHostConfig(h.key)?.ip || '—'}:${getHostConfig(h.key)?.port || '—'}` }}
                  </span>
                </div>

                <div class="row items-center justify-between q-mb-sm">
                  <span class="text-caption text-secondary">Host Status</span>
                  <q-badge
                    :color="getHostConfig(h.key)?.status === 'ONLINE' ? 'green-10' : 'red-10'"
                    :text-color="getHostConfig(h.key)?.status === 'ONLINE' ? 'green-4' : 'red-4'"
                    class="text-weight-bold text-caption font-mono cursor-pointer"
                    @click.stop="toggleOnlineStatus(h.key)"
                  >{{ getHostConfig(h.key)?.status || 'OFFLINE' }}</q-badge>
                </div>

                <div class="row items-center justify-between q-mb-md">
                  <span class="text-caption text-secondary">SLA Health Score</span>
                  <q-chip dense square color="purple-10" text-color="purple-3" class="text-weight-bold font-mono text-caption">
                    {{ metrics.hostSuccessRate?.[h.key] != null ? Math.round(metrics.hostSuccessRate[h.key]) : getHostConfig(h.key)?.healthScore || 0 }}%
                  </q-chip>
                </div>

                <q-separator color="purple-10" class="q-mb-sm" />
                <div class="row items-center justify-between">
                  <span class="text-caption text-secondary">Switch Routing</span>
                  <q-toggle :model-value="getHostConfig(h.key).isActive" :color="h.color" label="Enable Host" dense
                    @update:model-value="val => toggleHostStatus(h.key, val)" @click.stop :dark="prefs.isDarkMode" />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- SSL Certificate Viewer Card -->
        <q-card class="bg-panel border-main q-mt-lg" flat :dark="prefs.isDarkMode">
          <q-card-section class="q-pa-md bg-subpanel row items-center">
            <q-icon name="verified_user" color="purple-3" size="md" class="q-mr-sm" />
            <div>
              <div class="text-subtitle1 text-weight-bold text-white">SSL Certificates Governance</div>
              <div class="text-caption text-secondary">Enforced secure connections to processor switch hosts</div>
            </div>
          </q-card-section>
          <q-card-section class="q-pa-none">
            <q-table
              :rows="sslCertList"
              :columns="sslCertColumns"
              row-key="hostCode"
              flat :dark="prefs.isDarkMode"
              class="bg-transparent"
              table-header-class="bg-subpanel text-secondary"
              hide-bottom
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-issuer="props">
                <q-td :props="props">
                  <span class="text-weight-bold text-white">{{ props.value }}</span>
                </q-td>
              </template>
              <template v-slot:body-cell-validTo="props">
                <q-td :props="props">
                  <span :class="isCertExpired(props.value) ? 'text-red-4 text-weight-bold' : 'text-green-4'">
                    {{ new Date(props.value).toLocaleDateString() }}
                  </span>
                </q-td>
              </template>
              <template v-slot:body-cell-fingerprint="props">
                <q-td :props="props">
                  <span class="font-mono text-caption text-grey-5">{{ props.value }}</span>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>

        <!-- Sync Preview Actions -->
        <div class="row q-mt-lg justify-end">
          <q-btn unelevated color="purple-10" text-color="purple-3" label="Preview Sync Payload" icon="visibility" @click="showSyncPayloadDialog = true" :dark="prefs.isDarkMode" />
        </div>
      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════
           TAB 2 — RULES MATRIX
           ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="matrix" class="q-pa-none">
        <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
          <q-card-section class="bg-subpanel row items-center justify-between">
            <div>
              <div class="text-subtitle1 text-weight-bold text-white">Amount Thresholds Matrix</div>
              <div class="text-caption text-secondary">Configure preferred hosts for transactions based on NGN amount bands</div>
            </div>
            <q-btn unelevated color="purple-7" label="Add New Rule" icon="add" size="sm" @click="openMatrixRuleDialog()" :dark="prefs.isDarkMode" />
          </q-card-section>
          <q-card-section class="q-pa-none">
            <q-table
              :rows="config.thresholdRulesMatrix || []"
              :columns="matrixColumns"
              row-key="minAmount"
              flat :dark="prefs.isDarkMode"
              class="bg-transparent text-main"
              table-header-class="bg-subpanel text-secondary"
              hide-bottom
            >
              <template v-slot:body-cell-minAmount="props">
                <q-td :props="props">
                  <span class="font-mono text-white">{{ currentCurrency.symbol }}{{ props.value.toLocaleString() }}</span>
                </q-td>
              </template>
              <template v-slot:body-cell-maxAmount="props">
                <q-td :props="props">
                  <span class="font-mono text-white">{{ props.value >= 99999999 ? 'Infinity' : `${currentCurrency.symbol}${props.value.toLocaleString()}` }}</span>
                </q-td>
              </template>
              <template v-slot:body-cell-preferredHost="props">
                <q-td :props="props">
                  <q-chip dense square :color="hostColor(props.value.toUpperCase())" :text-color="hostTextColor(props.value.toUpperCase())" class="text-weight-bold text-caption font-mono">
                    {{ props.value.toUpperCase() }}
                  </q-chip>
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="row q-gutter-xs justify-center">
                  <q-btn flat round dense icon="edit" color="purple-3" size="sm" @click="openMatrixRuleDialog(props.row)" />
                  <q-btn flat round dense icon="delete" color="red-4" size="sm" @click="deleteMatrixRule(props.row)" />
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════
           TAB 3 — TENANT PROFILES
           ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="profiles" class="q-pa-none">
        <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
          <q-card-section class="bg-subpanel row items-center justify-between">
            <div>
              <div class="text-subtitle1 text-weight-bold text-white">Routing Profiles</div>
              <div class="text-caption text-secondary">Assign specific payment switch priorities to tenants, agents, or categories</div>
            </div>
            <q-btn unelevated color="purple-7" label="Add New Profile" icon="add" size="sm" @click="openProfileDialog()" :dark="prefs.isDarkMode" />
          </q-card-section>
          <q-card-section class="q-pa-none">
            <q-table
              :rows="config.tenantRoutingProfiles || []"
              :columns="profileColumns"
              :row-key="row => row.profileId || row.category"
              flat :dark="prefs.isDarkMode"
              class="bg-transparent text-main"
              table-header-class="bg-subpanel text-secondary"
              hide-bottom
            >
              <template v-slot:body-cell-target="props">
                <q-td :props="props">
                  <div class="row items-center q-gutter-xs">
                    <q-chip dense square color="blue-10" text-color="blue-3" class="text-caption font-mono">
                      {{ (props.row.scopeType || 'Category').toUpperCase() }}
                    </q-chip>
                    <span class="text-weight-bold">{{ props.row.targetValue || props.row.category }}</span>
                  </div>
                </q-td>
              </template>
              <template v-slot:body-cell-preferredHosts="props">
                <q-td :props="props">
                  <div class="row q-gutter-xs">
                    <q-chip v-for="host in props.value" :key="host" dense square :color="hostColor(host.toUpperCase())" :text-color="hostTextColor(host.toUpperCase())" class="text-weight-bold text-caption font-mono">
                      {{ host.toUpperCase() }}
                    </q-chip>
                  </div>
                </q-td>
              </template>
              <template v-slot:body-cell-fallbackHosts="props">
                <q-td :props="props">
                  <div class="row q-gutter-xs">
                    <q-chip v-for="host in props.value" :key="host" dense square color="grey-10" text-color="grey-4" class="text-weight-bold text-caption font-mono">
                      {{ host.toUpperCase() }}
                    </q-chip>
                  </div>
                </q-td>
              </template>
              <template v-slot:body-cell-rules="props">
                <q-td :props="props">
                  <div class="text-caption text-grey-5">
                    {{ props.row.amountThresholds?.length || 0 }} Amount Limit Rules | 
                    {{ props.row.transactionTypeRules?.length || 0 }} Tx Type Rules
                  </div>
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="row q-gutter-xs justify-center">
                  <q-btn flat round dense icon="edit" color="purple-3" size="sm" @click="openProfileDialog(props.row)" />
                  <q-btn flat round dense icon="delete" color="red-4" size="sm" @click="deleteProfile(props.row)" />
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════
           TAB 4 — ROUTE SIMULATOR
           ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="simulation" class="q-pa-none">
        <div class="row q-col-gutter-lg">
          <!-- Simulation Form -->
          <div class="col-12 col-md-5">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="bg-subpanel text-purple-4 text-weight-bold">
                <q-icon name="psychology" class="q-mr-sm" />Failover Simulation Engine
              </q-card-section>
              <q-card-section class="q-pa-md q-gutter-md">
                <q-input v-model.number="simData.amount" type="number" filled label="Transaction Amount" suffix="NGN" :prefix="currentCurrency.symbol" :dark="prefs.isDarkMode" />
                
                <q-select v-model="simData.tenantCategory" :options="['ALL', 'Retail', 'School', 'Hospitality', 'Healthcare', 'Government', 'Enterprise', 'Logistics']" filled label="Tenant Business Category" :dark="prefs.isDarkMode" />
                
                <q-select v-model="simData.transactionType" :options="['ALL', 'PURCHASE', 'CASH_OUT', 'REFUND', 'REVERSAL']" filled label="Transaction Type" :dark="prefs.isDarkMode" />
                
                <q-select v-model="simData.cardScheme" :options="['ALL', 'VISA', 'MASTERCARD', 'VERVE', 'UNKNOWN']" filled label="Card Scheme" :dark="prefs.isDarkMode" />

                <!-- Host Health Overrides -->
                <div>
                  <div class="text-caption text-secondary text-weight-bold q-mb-sm">HOST HEALTH OVERRIDES FOR SIMULATION</div>
                  <div class="row q-col-gutter-xs">
                    <div class="col-6" v-for="host in config.hosts" :key="host.hostCode">
                      <q-card class="bg-subpanel border-main q-pa-xs" flat :dark="prefs.isDarkMode">
                        <div class="row items-center justify-between">
                          <span class="text-caption text-white font-mono q-pl-sm">{{ host.hostCode.toUpperCase() }}</span>
                          <q-btn-toggle
                            v-model="simData.hostHealthOverrides[host.hostCode].status"
                            dense flat
                            toggle-color="purple-8"
                            :options="[
                              { label: 'ON', value: 'ONLINE' },
                              { label: 'OFF', value: 'OFFLINE' }
                            ]"
                            :dark="prefs.isDarkMode"
                          />
                        </div>
                      </q-card>
                    </div>
                  </div>
                </div>

                <q-btn unelevated color="purple-7" label="Trigger Route Simulation" class="full-width" @click="runSimulation" :dark="prefs.isDarkMode" />
              </q-card-section>
            </q-card>
          </div>

          <!-- Simulation Output Trace -->
          <div class="col-12 col-md-7">
            <q-card class="bg-panel border-main full-height" flat :dark="prefs.isDarkMode" style="min-height:380px">
              <q-card-section class="bg-subpanel text-cyan-4 text-weight-bold">
                <q-icon name="linear_scale" class="q-mr-sm" />Live Switch Routing Path Trace
              </q-card-section>
              <q-card-section class="q-pa-md">
                <div v-if="!simResult" class="flex flex-center text-center text-secondary q-pa-xl">
                  <div>
                    <q-icon name="alt_route" size="4em" color="grey-7" class="q-mb-md" />
                    <div>Fill out the simulator parameters and trigger simulation to visualize the payment switch routing path.</div>
                  </div>
                </div>
                
                <!-- Trace Flowchart Visualization -->
                <div v-else>
                  <div class="row items-center justify-center q-gutter-md q-mb-lg">
                    <!-- Client Terminal -->
                    <div class="col text-center">
                      <q-card class="bg-subpanel border-main q-pa-sm inline-block" flat :dark="prefs.isDarkMode" style="width:120px">
                        <q-icon name="point_of_sale" color="grey-4" size="md" />
                        <div class="text-caption text-weight-bold text-white q-mt-xs">mPOS Terminal</div>
                      </q-card>
                    </div>

                    <q-icon name="arrow_forward" size="md" color="purple-4" />

                    <!-- Authoritative Switchboard -->
                    <div class="col text-center">
                      <q-card class="bg-subpanel border-main q-pa-sm inline-block border-purple-glow" flat :dark="prefs.isDarkMode" style="width:150px">
                        <q-icon name="hub" color="purple-3" size="md" />
                        <div class="text-caption text-weight-bold text-white q-mt-xs">Switchboard Engine</div>
                        <div class="text-caption text-grey-5" style="font-size:9px">Evaluated Rules</div>
                      </q-card>
                    </div>

                    <q-icon name="arrow_forward" size="md" color="purple-4" />

                    <!-- Resolved Host -->
                    <div class="col text-center">
                      <q-card class="bg-panel border-main q-pa-sm inline-block border-green-glow animate-pulse" flat :dark="prefs.isDarkMode" style="width:140px">
                        <q-icon :name="hostIcon(simResult.routeName)" :color="hostTextColor(simResult.routeName)" size="md" />
                        <div class="text-caption text-weight-bold text-white q-mt-xs">{{ simResult.routeName }}</div>
                        <q-badge color="green-10" text-color="green-4" dense class="text-caption font-mono">SELECTED ROUTE</q-badge>
                      </q-card>
                    </div>
                  </div>

                  <q-separator color="purple-10" class="q-mb-md" />
                  
                  <div class="text-subtitle2 text-purple-3 q-mb-xs">Decision Trace Log</div>
                  <q-list dense flat class="bg-subpanel rounded-borders q-pa-sm font-mono text-caption" style="line-height: 1.6">
                    <q-item>
                      <q-item-section avatar><q-icon name="check" color="green-4" size="xs" /></q-item-section>
                      <q-item-section>Tenant ID parsed and resolved Category profile to <b>{{ simData.tenantCategory }}</b>.</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section avatar><q-icon name="check" color="green-4" size="xs" /></q-item-section>
                      <q-item-section>Transaction amount <b>₦{{ simData.amount.toLocaleString() }}</b> evaluated against active matrices.</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section avatar><q-icon name="check" color="green-4" size="xs" /></q-item-section>
                      <q-item-section>Verified constraints support on all hosts for card scheme <b>{{ simData.cardScheme }}</b> and type <b>{{ simData.transactionType }}</b>.</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section avatar><q-icon name="check" color="green-4" size="xs" /></q-item-section>
                      <q-item-section>Calculated dynamic Host SLA performance score using live health metrics.</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section avatar><q-icon name="check" color="green-4" size="xs" /></q-item-section>
                      <q-item-section>Resolved primary switch host destination → <b class="text-green-4 font-mono">{{ simResult.routeName }}</b>.</q-item-section>
                    </q-item>
                  </q-list>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════
           TAB 5 — SLA OBSERVABILITY
           ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="observability" class="q-pa-none">
        <!-- Row 1: Latency & Volume over time -->
        <div class="row q-col-gutter-md q-mb-md">
          <!-- Live SLA Latency -->
          <div class="col-12 col-md-6">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-purple-4 q-mb-sm">
                  <q-icon name="show_chart" class="q-mr-xs" />Switchboard Response Latencies (ms)
                </div>
                <apexchart type="bar" height="220" :options="latencyChartOpts" :series="latencySeries" />
              </q-card-section>
            </q-card>
          </div>

          <!-- Transaction Volume over time (Area) -->
          <div class="col-12 col-md-6">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-purple-4 q-mb-sm">
                  <q-icon name="show_chart" class="q-mr-xs" />Transaction Volume (Last 7 Days)
                </div>
                <apexchart type="area" height="220" :options="volumeChartOpts" :series="volumeSeries" />
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Row 2: Failover, Approval Rate & Host distribution -->
        <div class="row q-col-gutter-md q-mb-md">
          <!-- Failover Incidents Count -->
          <div class="col-12 col-md-4">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-red-4 q-mb-sm">
                  <q-icon name="warning" class="q-mr-xs" />Failover Incidents by Host
                </div>
                <apexchart type="donut" height="220" :options="failoverChartOpts" :series="failoverSeries" />
              </q-card-section>
            </q-card>
          </div>

          <!-- Approval rate donut -->
          <div class="col-12 col-md-4">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-green-4 q-mb-sm">
                  <q-icon name="check_circle" class="q-mr-xs" />Approval vs. Decline Rate
                </div>
                <apexchart type="donut" height="220" :options="approvalChartOpts" :series="approvalSeries" />
              </q-card-section>
            </q-card>
          </div>

          <!-- Transaction Distribution by Host -->
          <div class="col-12 col-md-4">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-cyan-4 q-mb-sm">
                  <q-icon name="lan" class="q-mr-xs" />Transaction Distribution by Host
                </div>
                <apexchart type="bar" height="220" :options="hostBarOpts" :series="hostBarSeries" />
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Row 3: Avg amount & Stacked Approved vs Declined -->
        <div class="row q-col-gutter-md q-mb-md">
          <!-- Avg Amount by Host -->
          <div class="col-12 col-md-6">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-amber-4 q-mb-sm">
                  <q-icon name="payments" class="q-mr-xs" />Average Transaction Amount by Host
                </div>
                <apexchart type="bar" height="220" :options="avgAmountOpts" :series="avgAmountSeries" />
              </q-card-section>
            </q-card>
          </div>

          <!-- Stacked Approved vs Declined by Host -->
          <div class="col-12 col-md-6">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-teal-4 q-mb-sm">
                  <q-icon name="bar_chart" class="q-mr-xs" />Approved vs. Declined Attempts by Host
                </div>
                <apexchart type="bar" height="220" :options="stackedOpts" :series="stackedSeries" />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════
           TAB 6 — ISO8583 TRANSACTIONS
           ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="transactions" class="q-pa-none">
        <!-- Filter Bar -->
        <q-card class="bg-panel border-main q-mb-md" flat :dark="prefs.isDarkMode">
          <q-card-section class="q-pa-md">
            <div class="row q-col-gutter-sm items-end">
              <div class="col-12 col-sm-6 col-md-2">
                <q-input v-model="fTenant" dense filled clearable label="Business Owner" prepend-icon="business" :dark="prefs.isDarkMode" />
              </div>
              <div class="col-12 col-sm-6 col-md-2">
                <q-input v-model.number="fAmountMin" type="number" dense filled clearable label="Amount Greater (₦)" :prefix="currentCurrency.symbol" :dark="prefs.isDarkMode" />
              </div>
              <div class="col-12 col-sm-6 col-md-2">
                <q-input v-model.number="fAmountMax" type="number" dense filled clearable label="Amount Less (₦)" :prefix="currentCurrency.symbol" :dark="prefs.isDarkMode" />
              </div>
              <div class="col-12 col-sm-6 col-md-2">
                <q-input v-model="fDate" dense filled clearable label="Date (YYYY-MM-DD)" :dark="prefs.isDarkMode">
                  <template v-slot:append>
                    <q-icon name="event" class="cursor-pointer" color="purple-4">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-date v-model="fDate" mask="YYYY-MM-DD" :dark="prefs.isDarkMode">
                          <div class="row items-center justify-end">
                            <q-btn v-close-popup label="Close" color="purple-4" flat />
                          </div>
                        </q-date>
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6 col-md-2">
                <q-select v-model="fHost" :options="['All','KIMONO','MEDUSA','NIBSS','EXPRESS_PAY']" dense filled label="Host" :dark="prefs.isDarkMode" />
              </div>
              <div class="col-12 col-sm-6 col-md-2">
                <q-select v-model="fStatus" :options="['All','Approved','Declined']" dense filled label="Status" :dark="prefs.isDarkMode" />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Table -->
        <q-table
          :rows="filteredHistory"
          :columns="txColumns"
          row-key="id"
          flat bordered
          class="bg-panel text-main border-main shadow-1"
          card-class="bg-panel"
          table-header-class="bg-subpanel text-secondary text-weight-bold"
          :loading="loading"
          :dark="prefs.isDarkMode"
          :pagination="{ rowsPerPage: 10 }"
        >
          <template v-slot:body-cell-host="props">
            <q-td :props="props">
              <q-chip dense square :color="hostColor(props.value)" :text-color="hostTextColor(props.value)"
                :icon="hostIcon(props.value)" class="text-weight-bold text-caption font-mono">
                {{ props.value }}
              </q-chip>
            </q-td>
          </template>
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="props.value === 'Approved' ? 'green-10' : 'red-10'"
                :text-color="props.value === 'Approved' ? 'green-4' : 'red-4'" class="text-weight-bold font-mono">
                {{ props.value.toUpperCase() }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-amount="props">
            <q-td :props="props">
              <span class="text-weight-bold font-mono text-white">{{ currentCurrency.symbol }}{{ Number(props.value).toLocaleString() }}</span>
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense icon="remove_red_eye" color="cyan-4" size="sm" @click="viewTxDetail(props.row)">
                <q-tooltip>View detail</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════
           TAB 7 — AUDIT TRAIL
           ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="audits" class="q-pa-none">
        <q-card class="bg-panel border-main animate-hover" flat :dark="prefs.isDarkMode">
          <q-card-section class="bg-subpanel text-purple-4 text-weight-bold">
            <q-icon name="history" class="q-mr-sm" />Configuration Audit Log
          </q-card-section>
          <q-card-section class="q-pa-md">
            <q-timeline color="purple-4" dark>
              <q-timeline-entry
                v-for="log in metrics.recentAuditTrail || []"
                :key="log.id"
                :title="log.action_type"
                :subtitle="new Date(log.created_at).toLocaleString()"
                side="left"
                icon="admin_panel_settings"
              >
                <div class="text-caption text-white font-mono">
                  Admin: <b>{{ log.admin_id }}</b> | Reason: <b>{{ log.reason || 'No reason specified' }}</b>
                </div>
                <pre class="bg-subpanel q-pa-xs rounded-borders text-caption font-mono text-grey-5 q-mt-xs" style="max-height:80px; overflow:auto">
                  {{ JSON.stringify(log.metadata, null, 2) }}
                </pre>
              </q-timeline-entry>
            </q-timeline>
          </q-card-section>
        </q-card>
      </q-tab-panel>

    </q-tab-panels>

    <!-- ── Host Details Drawer ──────────────────────────────────────── -->
    <q-dialog v-model="showHostDrawer" position="right" full-height :dark="prefs.isDarkMode">
      <q-card style="width: 480px; max-width: 90vw" class="bg-panel text-main border-main" :dark="prefs.isDarkMode">
        <q-card-section class="bg-subpanel text-purple-4 text-weight-bold row items-center">
          <q-icon name="dns" class="q-mr-sm" />Switch Host Parameters: {{ editingHost?.hostName }}
        </q-card-section>

        <q-card-section v-if="editingHost" class="q-pa-md scroll" style="height: calc(100% - 120px)">
          <div class="q-gutter-md">
            <q-input v-model="editingHost.hostName" filled label="Host Name" :dark="prefs.isDarkMode" />
            <q-input v-model="editingHost.ip" filled label="IP Address / Hostname" :dark="prefs.isDarkMode" />
            <q-input v-model.number="editingHost.port" type="number" filled label="TCP Port" :dark="prefs.isDarkMode" />
            <q-input v-model.number="editingHost.timeoutSeconds" type="number" filled label="Timeout (Seconds)" :dark="prefs.isDarkMode" />
            <q-select v-model="editingHost.priority" :options="[{label: 'Extra High', value: 1}, {label: 'High', value: 2}, {label: 'Medium', value: 3}, {label: 'Low', value: 4}]" emit-value map-options filled label="Priority Order" :dark="prefs.isDarkMode" />
            <q-input v-model.number="editingHost.failoverPriority" type="number" filled label="Failover Priority Order" :dark="prefs.isDarkMode" />
            <q-toggle v-model="editingHost.sslEnabled" label="Enable SSL" :dark="prefs.isDarkMode" />
            <q-select v-model="editingHost.status" :options="['ONLINE', 'OFFLINE', 'DEGRADED']" filled label="Host Status" :dark="prefs.isDarkMode" />

            <q-separator color="purple-10" />
            <div class="text-caption text-secondary text-weight-bold">SUPPORTED CRITERIA</div>
            
            <q-select v-model="editingHost.supportedCardSchemes" multiple use-chips filled label="Supported Card Schemes" :options="['VISA', 'MASTERCARD', 'VERVE', 'UNKNOWN']" :dark="prefs.isDarkMode" />
            
            <q-select v-model="editingHost.supportedTransactionTypes" multiple use-chips filled label="Supported Transaction Types" :options="['PURCHASE', 'CASH_OUT', 'REFUND', 'REVERSAL']" :dark="prefs.isDarkMode" />

            <q-select v-model="editingHost.supportedTenantCategories" multiple use-chips filled label="Supported Tenant Categories" :options="['Retail', 'School', 'Hospitality', 'Healthcare', 'Government', 'Enterprise', 'Logistics']" :dark="prefs.isDarkMode" />

            <!-- Host Specific Auth / Secrets -->
            <template v-if="editingHost.hostCode === 'express_pay'">
              <q-separator color="purple-10" />
              <div class="text-caption text-secondary text-weight-bold">EXPRESSPAY SPECIFICS</div>
              <q-input v-model="editingHost.baseUrl" filled label="Base URL" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.authToken" filled label="Auth Token" type="password" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.merchantCode" filled label="Merchant Code" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.terminalGroup" filled label="Terminal Group" :dark="prefs.isDarkMode" />
            </template>

            <template v-if="editingHost.hostCode === 'kimono'">
              <q-separator color="purple-10" />
              <div class="text-caption text-secondary text-weight-bold">KIMONO SPECIFICS</div>
              <q-input v-model="editingHost.baseUrl" filled label="Base URL" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.transactionPath" filled label="Transaction Path" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.paramsPath" filled label="Parameters Path" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.kimonoKeys.masterKey" filled label="Master Key" type="password" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.kimonoKeys.pinKey" filled label="PIN Key" type="password" :dark="prefs.isDarkMode" />
              
              <q-separator color="purple-10" />
              <div class="text-caption text-secondary text-weight-bold">KIMONO FALLBACK PARAMS</div>
              <q-input v-model="editingHost.kimonoFallbackParameters.merchantId" filled label="Fallback Merchant ID" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.kimonoFallbackParameters.uniqueId" filled label="Fallback Unique ID" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.kimonoFallbackParameters.institutionId" filled label="Fallback Institution ID" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.kimonoFallbackParameters.settlementAccount" filled label="Fallback Settlement Account" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.kimonoFallbackParameters.keyLabel" filled label="Fallback Key Label" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.kimonoFallbackParameters.token" filled label="Fallback Token" type="password" :dark="prefs.isDarkMode" />
            </template>

            <template v-if="editingHost.hostCode === 'nibss'">
              <q-separator color="purple-10" />
              <div class="text-caption text-secondary text-weight-bold">NIBSS SPECIFICS</div>
              <q-input v-model="editingHost.nibssConfig.ctmk" filled label="Component Terminal Master Key (CTMK)" type="password" :dark="prefs.isDarkMode" />
              <q-input v-model="editingHost.nibssConfig.ptspCode" filled label="PTSP Code (e.g. GA)" :dark="prefs.isDarkMode" />
            </template>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="bg-subpanel">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup :dark="prefs.isDarkMode" />
          <q-btn unelevated color="purple-7" label="Save Changes" @click="saveHostDetails" :dark="prefs.isDarkMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Matrix Rule Dialog ──────────────────────────────────────── -->
    <q-dialog v-model="showMatrixDialog" :dark="prefs.isDarkMode">
      <q-card style="min-width:380px" class="bg-panel text-main border-main" :dark="prefs.isDarkMode">
        <q-card-section class="bg-subpanel text-purple-4 text-weight-bold">
          <q-icon name="grid_on" class="q-mr-sm" />{{ editingMatrixRule ? 'Edit Threshold Rule' : 'Add Threshold Rule' }}
        </q-card-section>
        <q-card-section class="q-pa-md q-gutter-md">
          <q-input v-model.number="matrixRuleForm.minAmount" type="number" filled label="Min Amount (NGN)" :prefix="currentCurrency.symbol" :dark="prefs.isDarkMode" />
          <q-input v-model.number="matrixRuleForm.maxAmount" type="number" filled label="Max Amount (NGN)" :prefix="currentCurrency.symbol" :dark="prefs.isDarkMode" />
          <q-select v-model="matrixRuleForm.preferredHost" :options="['express_pay', 'kimono', 'medusa', 'nibss']" filled label="Preferred Switch Host" :dark="prefs.isDarkMode" />
        </q-card-section>
        <q-card-actions align="right" class="bg-subpanel">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup :dark="prefs.isDarkMode" />
          <q-btn unelevated color="purple-7" label="Save Rule" @click="saveMatrixRule" :dark="prefs.isDarkMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Profile Dialog ──────────────────────────────────────────── -->
    <q-dialog v-model="showProfileDialog" :dark="prefs.isDarkMode">
      <q-card style="min-width:420px" class="bg-panel text-main border-main" :dark="prefs.isDarkMode">
        <q-card-section class="bg-subpanel text-purple-4 text-weight-bold">
          <q-icon name="supervised_user_circle" class="q-mr-sm" />{{ editingProfile ? 'Edit Tenant Profile' : 'Add Tenant Profile' }}
        </q-card-section>
        <q-card-section class="q-pa-md q-gutter-md">
          <q-select v-model="profileForm.scopeType" :options="['Category', 'Tenant', 'Agent', 'Group']" filled label="Profile Scope" :dark="prefs.isDarkMode" />
          
          <q-select v-if="profileForm.scopeType === 'Category'" v-model="profileForm.targetValue" :options="['Retail', 'School', 'Hospitality', 'Healthcare', 'Government', 'Enterprise', 'Logistics']" filled label="Tenant Category" :dark="prefs.isDarkMode" />
          
          <q-select v-else-if="profileForm.scopeType === 'Agent'" v-model="profileForm.targetValue" :options="agentOptions" :option-label="opt => opt.name || opt.agentCode || opt.id || opt" :option-value="opt => opt.agentCode || opt.id || opt" emit-value map-options filled label="Select Agent" :dark="prefs.isDarkMode" />
          
          <q-select v-else-if="profileForm.scopeType === 'Tenant'" v-model="profileForm.targetValue" :options="tenantOptions" :option-label="opt => opt.name || opt.id || opt" :option-value="opt => opt.id || opt" emit-value map-options filled label="Select Tenant" :dark="prefs.isDarkMode" />
          
          <q-select v-else-if="profileForm.scopeType === 'Group'" v-model="profileForm.targetValue" :options="groupOptions" filled label="Select Group" :dark="prefs.isDarkMode" />

          <q-input v-else v-model="profileForm.targetValue" filled :label="profileForm.scopeType + ' ID'" :dark="prefs.isDarkMode" />

          <q-select v-model="profileForm.preferredHosts" multiple use-chips :options="['express_pay', 'kimono', 'medusa', 'nibss']" filled label="Preferred Hosts List" :dark="prefs.isDarkMode" />

          <q-select v-model="profileForm.fallbackHosts" multiple use-chips :options="['express_pay', 'kimono', 'medusa', 'nibss']" filled label="Fallback Hosts List" :dark="prefs.isDarkMode" />
          
          <q-separator :dark="prefs.isDarkMode" />
          <q-toggle v-model="profileForm.processOnDevice" label="Process Transactions Directly on MPOS Device" color="purple-3" :dark="prefs.isDarkMode" />
          <q-input v-if="profileForm.processOnDevice" v-model="profileForm.webhookUrl" filled label="Webhook Endpoint URL" placeholder="https://your.webhook.com/api/pos/transaction" :dark="prefs.isDarkMode" hint="Endpoint to hit after device processing succeeds/fails" />

          <q-slide-transition>
            <div v-if="profileForm.processOnDevice" class="q-mt-md">
              <div class="text-subtitle2 q-mb-sm text-purple-4">Affected Devices ({{ affectedDevices.length }})</div>
              <q-card flat bordered class="bg-subpanel rounded-borders" :dark="prefs.isDarkMode" style="max-height: 250px; overflow-y: auto; position: relative;">
                <q-inner-loading :showing="loadingAffectedDevices" :dark="prefs.isDarkMode" />
                <q-list v-if="affectedDevices.length > 0" separator :dark="prefs.isDarkMode">
                  <q-item v-for="(dev, idx) in affectedDevices" :key="idx" :dark="prefs.isDarkMode" v-ripple tag="label">
                    <q-item-section side>
                      <q-checkbox v-model="dev.confirmed" color="purple-5" :dark="prefs.isDarkMode" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-weight-bold">Mobile: {{ dev.tabletModel }} (SN: {{ dev.tabletSerial }})</q-item-label>
                      <q-item-label caption :class="prefs.isDarkMode ? 'text-grey-4' : 'text-grey-8'">
                        MPOS: {{ dev.mposModel }} (SN: {{ dev.mposSerial }})
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-chip dense square color="blue-10" text-color="blue-3" class="text-caption font-mono">TID: {{ dev.terminalId }}</q-chip>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else-if="!loadingAffectedDevices" class="text-caption text-grey text-center q-pa-md">
                  No active devices found for this target.
                </div>
              </q-card>
            </div>
          </q-slide-transition>
        </q-card-section>
        <q-card-actions align="right" class="bg-subpanel">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup :dark="prefs.isDarkMode" />
          <q-btn unelevated color="purple-7" label="Save Profile" @click="saveProfile" :dark="prefs.isDarkMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Sync Payload Preview Dialog ─────────────────────────────── -->
    <q-dialog v-model="showSyncPayloadDialog" :dark="prefs.isDarkMode">
      <q-card style="min-width:680px; max-width:90vw" class="bg-panel text-main border-main" :dark="prefs.isDarkMode">
        <q-card-section class="bg-subpanel text-purple-4 text-weight-bold row items-center">
          <q-icon name="terminal" class="q-mr-sm" />Sync Distribution Payload Preview
          <q-space />
          <q-chip dense square color="green-10" text-color="green-4" class="text-caption font-mono">SECRETS MASKED</q-chip>
        </q-card-section>
        <q-card-section class="q-pa-md">
          <pre class="bg-subpanel rounded-borders q-pa-sm text-caption font-mono text-grey-4" style="max-height:480px; overflow:auto">{{ JSON.stringify(mockSyncPayload, null, 2) }}</pre>
        </q-card-section>
        <q-card-actions align="right" class="bg-subpanel">
          <q-btn flat label="Close" color="grey-5" v-close-popup :dark="prefs.isDarkMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── TX Detail Dialog ──────────────────────────────────────── -->
    <q-dialog v-model="showTxDialog" :dark="prefs.isDarkMode">
      <q-card style="min-width:580px;max-width:92vw" class="bg-panel text-main border-main" :dark="prefs.isDarkMode">
        <q-card-section class="bg-subpanel text-purple-4 text-weight-bold row items-center">
          <q-icon name="receipt_long" class="q-mr-sm" />Transaction Detail
          <q-space />
          <q-badge :color="selectedTx?.status === 'Approved' ? 'green-10' : 'red-10'"
            :text-color="selectedTx?.status === 'Approved' ? 'green-4' : 'red-4'" class="text-weight-bold font-mono">
            {{ selectedTx?.status?.toUpperCase() }}
          </q-badge>
        </q-card-section>
        <q-card-section v-if="selectedTx" class="q-pa-lg">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-6"><div class="text-caption text-secondary">Host</div><div class="font-mono text-weight-bold text-white">{{ selectedTx.host }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">Response Code</div>
              <div class="font-mono text-weight-bold" :class="selectedTx.statusCode === '00' ? 'text-green-4' : 'text-red-4'">{{ selectedTx.statusCode }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">Amount</div><div class="text-weight-bold text-white">{{ currentCurrency.symbol }}{{ Number(selectedTx.amount).toLocaleString() }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">Terminal</div><div class="font-mono text-weight-bold text-white">{{ selectedTx.terminalId }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">RRN</div><div class="font-mono text-weight-bold text-white">{{ selectedTx.rrn }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">STAN</div><div class="font-mono text-weight-bold text-white">{{ selectedTx.stan }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">Card</div><div class="font-mono text-weight-bold text-white">{{ selectedTx.maskedPan }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">Tenant</div><div class="font-mono text-weight-bold text-white">{{ selectedTx.tenantId || '—' }}</div></div>
            <div class="col-12">
              <div class="text-caption text-secondary q-mb-xs">Raw Request</div>
              <pre class="bg-subpanel rounded-borders q-pa-sm text-caption font-mono text-grey-4" style="max-height:120px;overflow:auto;white-space:pre-wrap">{{ selectedTx.rawRequest }}</pre>
            </div>
            <div class="col-12">
              <div class="text-caption text-secondary q-mb-xs">Raw Response</div>
              <pre class="bg-subpanel rounded-borders q-pa-sm text-caption font-mono text-grey-4" style="max-height:120px;overflow:auto;white-space:pre-wrap">{{ selectedTx.rawResponse }}</pre>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="bg-subpanel">
          <q-btn flat label="Close" color="grey-5" v-close-popup :dark="prefs.isDarkMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useOperatorPreferences } from '../composables/useOperatorPreferences'
import { posApi, adminApi } from '../api'
import ApexCharts from 'vue3-apexcharts'

const apexchart = ApexCharts

const $q      = useQuasar()
const { prefs } = useOperatorPreferences()

// ── State ──────────────────────────────────────────────────────────
const activeTab  = ref('hosts')
const loading    = ref(false)
const history    = ref([])
const showTxDialog = ref(false)
const selectedTx   = ref(null)

// Host details drawer
const showHostDrawer = ref(false)
const editingHost = ref(null)

// Matrix Rule Dialog
const showMatrixDialog = ref(false)
const editingMatrixRule = ref(null)
const matrixRuleForm = ref({ minAmount: 0, maxAmount: 10000, preferredHost: 'express_pay' })

// Profile Dialog
const showProfileDialog = ref(false)
const editingProfile = ref(null)
const profileForm = ref({ profileId: null, scopeType: 'Category', targetValue: 'Retail', category: 'Retail', preferredHosts: [], fallbackHosts: [], processOnDevice: false, webhookUrl: '' })
const agentOptions = ref([])
const tenantOptions = ref([])
const groupOptions = ref(['Standard Group', 'VIP Group', 'Beta Group', 'Default'])
const affectedDevices = ref([])
const loadingAffectedDevices = ref(false)

// Sync Payload Preview
const showSyncPayloadDialog = ref(false)

watch([() => profileForm.value.targetValue, () => profileForm.value.processOnDevice, () => profileForm.value.scopeType], async ([newTarget, newProcessOnDevice, newScope]) => {
  if (newProcessOnDevice && newTarget && newScope) {
    try {
      loadingAffectedDevices.value = true
      affectedDevices.value = []
      const res = await posApi.getAffectedDevices({ scopeType: newScope, targetValue: newTarget })
      affectedDevices.value = res.data.map((d) => ({ ...d, confirmed: false }))
    } catch (err) {
      $q.notify({ color: 'negative', message: 'Failed to load affected devices' })
    } finally {
      loadingAffectedDevices.value = false
    }
  } else {
    affectedDevices.value = []
  }
}, { immediate: true })

watch(() => profileForm.value.scopeType, () => {
  profileForm.value.targetValue = ''
})

// Simulation State
const simData = ref({
  amount: 25000,
  tenantCategory: 'Retail',
  transactionType: 'PURCHASE',
  cardScheme: 'VISA',
  hostHealthOverrides: {
    express_pay: { status: 'ONLINE', healthScore: 95 },
    kimono: { status: 'ONLINE', healthScore: 99 },
    medusa: { status: 'ONLINE', healthScore: 92 },
    nibss: { status: 'OFFLINE', healthScore: 0 }
  }
})
const simResult = ref(null)

// Metrics Observability State
const metrics = ref({
  totalTransactions: 0,
  successRate: 100,
  hostDistribution: {},
  hostSuccessRate: {},
  hostAvgLatency: {},
  hostFailoverCount: {},
  recentAuditTrail: []
})

// Filters (tab 6)
const fTenant    = ref('')
const fAmountMin = ref(null)
const fAmountMax = ref(null)
const fDate      = ref('')
const fHost      = ref('All')
const fStatus    = ref('All')

const config = ref({
  activeHost: 'express_pay',
  failoverOrder: ['express_pay', 'kimono', 'medusa', 'nibss'],
  splitThresholdNaira: 50000,
  thresholdRulesMatrix: [],
  tenantRoutingProfiles: [],
  hosts: []
})

// ── Host definitions ───────────────────────────────────────────────
const hostDefs = [
  { key: 'express_pay', label: 'Express Pay',   proto: 'ISO8583 · TCP Socket',         icon: 'payments',                 color: 'green-4',  glowColor: '#4ade80' },
  { key: 'kimono',      label: 'Cpoint-Kimono', proto: 'HTTPS REST · Interswitch',    icon: 'cloud',                    color: 'purple-4', glowColor: '#a78bfa' },
  { key: 'medusa',      label: 'Medusa',        proto: 'ISO8583 · TCP Socket',         icon: 'settings_input_component', color: 'cyan-4',   glowColor: '#22d3ee' },
  { key: 'nibss',       label: 'NIBSS',         proto: 'ISO8583 · TCP Socket',         icon: 'account_balance',          color: 'amber-4',  glowColor: '#fbbf24' }
]

const toggleOnlineStatus = async (code) => {
  if (!config.value.hosts) config.value.hosts = []
  let host = config.value.hosts.find(h => h.hostCode === code)
  if (!host) {
    host = { hostCode: code, isActive: false, ip: '', port: 0, status: 'ONLINE' }
    config.value.hosts.push(host)
  } else {
    host.status = host.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE'
  }
  await saveConfig(`Toggled host status ${code} to ${host.status}`)
}

const toggleHostStatus = async (code, val) => {
  if (!config.value.hosts) config.value.hosts = []
  let host = config.value.hosts.find(h => h.hostCode === code)
  if (!host) {
    host = { hostCode: code, isActive: val, ip: '', port: 0 }
    config.value.hosts.push(host)
  } else {
    host.isActive = val
  }
  
  // Align activeHost with the highest priority active host
  config.value.hosts.sort((a, b) => (a.priority || 99) - (b.priority || 99))
  const actives = config.value.hosts.filter(h => h.isActive)
  config.value.activeHost = actives.length > 0 ? actives[0].hostCode : ''

  await saveConfig(`Toggled host ${code} to ${val ? 'enabled' : 'disabled'}`)
}

const activeHostHierarchy = computed(() => {
  return (config.value.hosts || [])
    .filter(h => h.isActive)
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
    .map(h => h.hostCode)
})

const getHostRankBadge = (hostCode) => {
  const index = activeHostHierarchy.value.indexOf(hostCode)
  if (index === 0) return { label: 'PRIMARY', color: '#4ade80' } // Green
  if (index === 1) return { label: 'SECONDARY', color: '#60a5fa' } // Blue
  if (index === 2) return { label: 'TERTIARY', color: '#c084fc' } // Purple
  if (index > 2) return { label: 'STANDBY', color: '#9ca3af' } // Gray
  return null
}

// ── Columns definitions ────────────────────────────────────────────
const txColumns = [
  { name: 'date',       label: 'Date',        field: r => new Date(r.date).toLocaleString(), align: 'left',   sortable: true },
  { name: 'tenantId',   label: 'Business Owner', field: 'tenantId',   align: 'left'   },
  { name: 'terminalId', label: 'Terminal ID',  field: 'terminalId',   align: 'left'   },
  { name: 'host',       label: 'Routed Host',  field: 'host',         align: 'center' },
  { name: 'amount',     label: 'Amount',       field: 'amount',       align: 'right',  sortable: true },
  { name: 'maskedPan',  label: 'Card PAN',     field: 'maskedPan',    align: 'left'   },
  { name: 'statusCode', label: 'Code',         field: 'statusCode',   align: 'center' },
  { name: 'status',     label: 'Status',       field: 'status',       align: 'center', sortable: true },
  { name: 'actions',    label: 'Trace',        field: 'actions',      align: 'center' }
]

const matrixColumns = [
  { name: 'minAmount',     label: 'Min Amount',     field: 'minAmount',     align: 'left' },
  { name: 'maxAmount',     label: 'Max Amount',     field: 'maxAmount',     align: 'left' },
  { name: 'preferredHost', label: 'Preferred Host', field: 'preferredHost', align: 'center' },
  { name: 'actions',       label: 'Actions',        field: 'actions',       align: 'center' }
]

const profileColumns = [
  { name: 'target',         label: 'Profile Target',   field: 'target',         align: 'left' },
  { name: 'preferredHosts', label: 'Preferred Hosts',  field: 'preferredHosts', align: 'left' },
  { name: 'fallbackHosts',  label: 'Fallback Hosts',   field: 'fallbackHosts',  align: 'left' },
  { name: 'rules',          label: 'Specific Rules',   field: 'rules',          align: 'left' },
  { name: 'actions',        label: 'Actions',          field: 'actions',        align: 'center' }
]

const sslCertColumns = [
  { name: 'hostCode',    label: 'Host',              field: r => String(r.hostCode).toUpperCase(), align: 'left' },
  { name: 'issuer',      label: 'Certificate Issuer', field: 'issuer',                            align: 'left' },
  { name: 'validTo',     label: 'Expires On',         field: 'validTo',                           align: 'left' },
  { name: 'fingerprint', label: 'SHA-256 Fingerprint',field: 'fingerprint',                       align: 'left' }
]

// ── Getters / Helpers ──────────────────────────────────────────────
const getHostConfig = (code) => {
  return config.value.hosts?.find(h => h.hostCode === code) || {}
}

const sslCertList = computed(() => {
  return config.value.hosts?.filter(h => h.sslCertMetadata).map(h => ({
    hostCode: h.hostCode,
    issuer: h.sslCertMetadata.issuer,
    validTo: h.sslCertMetadata.validTo,
    fingerprint: h.sslCertMetadata.fingerprint
  })) || []
})

const isCertExpired = (validTo) => {
  return new Date(validTo) < new Date()
}

const mockSyncPayload = computed(() => {
  const expressPay = config.value.hosts?.find(h => h.hostCode === 'express_pay')
  const kimono = config.value.hosts?.find(h => h.hostCode === 'kimono')
  const nibss = config.value.hosts?.find(h => h.hostCode === 'nibss')
  
  const activeHosts = (config.value.hosts || [])
    .filter(h => h.isActive)
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))

  return {
    assigned: true,
    terminalId: '20330002',
    mposTerminalId: 'mpos-1780133656325-0.3101378214529058',
    posSerialNumber: 'VM3041056610_Android',
    businessName: 'My Business',
    terminalType: 'Aisino MPOS',
    configVersion: 1,
    syncedAt: new Date().toISOString(),
    printerMac: '66:32:93:4A:04:27',
    printerModel: 'MPT-III',
    activeHost: config.value.activeHost.toUpperCase(),
    primaryHost: activeHosts[0] ? maskHost(activeHosts[0]) : null,
    secondaryHost: activeHosts[1] ? maskHost(activeHosts[1]) : null,
    tertiaryHost: activeHosts[2] ? maskHost(activeHosts[2]) : null,
    routingRules: {
      activeHost: config.value.activeHost,
      failoverOrder: config.value.failoverOrder,
      splitThresholdNaira: config.value.splitThresholdNaira
    },
    thresholdRules: config.value.thresholdRulesMatrix,
    tenantPolicy: config.value.tenantRoutingProfiles?.[0] || null,
    expressPayBaseUrl: expressPay?.baseUrl || null,
    expressPayAuthToken: '[SECRET_MASKED]',
    merchantCode: expressPay?.merchantCode || null,
    terminalGroup: expressPay?.terminalGroup || null,
    sslProfile: expressPay?.sslProfile || null,
    kimonoIp: kimono?.kimonoIp || null,
    kimonoPort: kimono?.kimonoPort || null,
    kimonoSSL: kimono?.kimonoSSL || false,
    kimonoKeys: { masterKey: '[SECRET_MASKED]', pinKey: '[SECRET_MASKED]' },
    nibssConfig: nibss?.nibssConfig ? { ...nibss.nibssConfig, ctmk: '[SECRET_MASKED]' } : null
  }
})

const maskHost = (host) => {
  const cloned = { ...host }
  if (cloned.authToken) cloned.authToken = '[SECRET_MASKED]'
  if (cloned.kimonoKeys) cloned.kimonoKeys = { masterKey: '[SECRET_MASKED]', pinKey: '[SECRET_MASKED]' }
  if (cloned.kimonoFallbackParameters?.token) cloned.kimonoFallbackParameters.token = '[SECRET_MASKED]'
  if (cloned.nibssConfig?.ctmk) cloned.nibssConfig.ctmk = '[SECRET_MASKED]'
  return cloned
}

// ── Filtered history ───────────────────────────────────────────────
const filteredHistory = computed(() => {
  return history.value.filter(tx => {
    if (fTenant.value    && !String(tx.tenantId || '').toLowerCase().includes(fTenant.value.toLowerCase())) return false
    if (fAmountMin.value && tx.amount < fAmountMin.value) return false
    if (fAmountMax.value && tx.amount > fAmountMax.value) return false
    if (fDate.value      && !new Date(tx.date).toISOString().startsWith(fDate.value))                        return false
    if (fHost.value !== 'All'   && tx.host   !== fHost.value)   return false
    if (fStatus.value !== 'All' && tx.status !== fStatus.value) return false
    return true
  })
})

// ── KPI cards ──────────────────────────────────────────────────────
const kpiCards = computed(() => {
  const all      = history.value
  const approved = all.filter(t => t.status === 'Approved')
  const declined = all.filter(t => t.status !== 'Approved')
  const total    = all.reduce((s, t) => s + (t.amount || 0), 0)
  const rate     = metrics.value.successRate || 100
  return [
    { label: 'Total Transactions', value: all.length,                           sub: 'Switchboard log total',     icon: 'receipt_long',   color: 'purple-4', valueColor: '#a78bfa' },
    { label: 'Switchboard Volume', value: `${currentCurrency.symbol}${total.toLocaleString()}`,          sub: 'Routed naira volume',        icon: 'payments',       color: 'teal-4',   valueColor: '#2dd4bf' },
    { label: 'Live Switch SLA',    value: `${rate}%`,                            sub: 'Successful route completion', icon: 'check_circle', color: 'green-4',  valueColor: '#4ade80' },
    { label: 'Failovers Triggered',value: metrics.value.totalTransactions ? Object.values(metrics.value.hostFailoverCount || {}).reduce((a,b)=>a+b,0) : 0, sub: 'Incidents handled dynamically', icon: 'warning', color: 'red-4', valueColor: '#f87171' }
  ]
})

// ── Chart configuration ────────────────────────────────────────────
const darkChartBase = {
  chart:    { background: 'transparent', toolbar: { show: false } },
  theme:    { mode: 'dark' },
  grid:     { borderColor: '#262930', strokeDashArray: 4 },
  tooltip:  { theme: 'dark' }
}

const latencySeries = computed(() => {
  const codes = ['express_pay', 'kimono', 'medusa', 'nibss']
  return [{
    name: 'Avg Latency (ms)',
    data: codes.map(c => metrics.value.hostAvgLatency?.[c] || 0)
  }]
})

const latencyChartOpts = computed(() => ({
  ...darkChartBase,
  colors: ['#a78bfa'],
  xaxis: { categories: ['ExpressPay', 'Kimono', 'Medusa', 'NIBSS'], labels: { style: { colors: '#8899aa' } } },
  yaxis: { labels: { style: { colors: '#8899aa' } } },
  plotOptions: { bar: { borderRadius: 5, columnWidth: '40%' } },
  dataLabels: { enabled: false }
}))

const failoverSeries = computed(() => {
  const codes = ['express_pay', 'kimono', 'medusa', 'nibss']
  return codes.map(c => metrics.value.hostFailoverCount?.[c] || 0)
})

const failoverChartOpts = computed(() => ({
  ...darkChartBase,
  labels: ['ExpressPay', 'Kimono', 'Medusa', 'NIBSS'],
  colors: ['#4ade80', '#a78bfa', '#22d3ee', '#f87171'],
  legend: { position: 'bottom', labels: { colors: '#8899aa' } },
  plotOptions: { pie: { donut: { size: '65%' } } },
  dataLabels: { enabled: false }
}))

// Volume area chart (last 7 days)
const volumeSeries = computed(() => {
  const days = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days[d.toISOString().slice(0, 10)] = 0
  }
  history.value.forEach(t => {
    const day = new Date(t.date).toISOString().slice(0, 10)
    if (days[day] !== undefined) days[day]++
  })
  return [{ name: 'Transactions', data: Object.values(days) }]
})
const volumeChartOpts = computed(() => ({
  ...darkChartBase,
  colors: ['#a78bfa'],
  xaxis: { categories: (() => { const d = []; for (let i = 6; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); d.push(x.toISOString().slice(5, 10)) } return d })(), labels: { style: { colors: '#8899aa' } } },
  yaxis: { labels: { style: { colors: '#8899aa' } } },
  fill:  { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.55, opacityTo: 0.05 } },
  stroke: { curve: 'smooth', width: 2 },
  dataLabels: { enabled: false },
}))

// Approval donut
const approvalSeries  = computed(() => {
  const a = history.value.filter(t => t.status === 'Approved').length
  const d = history.value.filter(t => t.status !== 'Approved').length
  return [a || 0, d || 0]
})
const approvalChartOpts = computed(() => ({
  ...darkChartBase,
  labels:  ['Approved', 'Declined'],
  colors:  ['#4ade80', '#f87171'],
  legend:  { position: 'bottom', labels: { colors: '#8899aa' } },
  plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', color: '#a78bfa' } } } } },
  dataLabels: { enabled: false },
}))

// Host bar
const hostBarSeries = computed(() => {
  const hosts = ['EXPRESS_PAY', 'KIMONO', 'MEDUSA', 'NIBSS']
  return [{ name: 'Transactions', data: hosts.map(h => history.value.filter(t => t.host?.toUpperCase() === h).length) }]
})
const hostBarOpts = computed(() => ({
  ...darkChartBase,
  colors: ['#4ade80', '#a78bfa', '#22d3ee', '#f87171'],
  xaxis:  { categories: ['ExpressPay', 'Kimono', 'Medusa', 'NIBSS'], labels: { style: { colors: '#8899aa' } } },
  yaxis:  { labels: { style: { colors: '#8899aa' } } },
  plotOptions: { bar: { borderRadius: 5, distributed: true } },
  legend: { show: false },
  dataLabels: { enabled: true, style: { colors: ['#fff'] } },
}))

// Avg amount by host
const avgAmountSeries = computed(() => {
  const hosts = ['EXPRESS_PAY', 'KIMONO', 'MEDUSA', 'NIBSS']
  return [{ name: 'Avg ' + currentCurrency.value.symbol, data: hosts.map(h => {
    const txs = history.value.filter(t => t.host?.toUpperCase() === h)
    return txs.length ? Math.round(txs.reduce((s, t) => s + (t.amount || 0), 0) / txs.length) : 0
  })}]
})
const avgAmountOpts = computed(() => ({
  ...darkChartBase,
  colors: ['#fbbf24'],
  xaxis:  { categories: ['ExpressPay', 'Kimono', 'Medusa', 'NIBSS'], labels: { style: { colors: '#8899aa' } } },
  yaxis:  { labels: { formatter: v => `${currentCurrency.value.symbol}${v.toLocaleString()}`, style: { colors: '#8899aa' } } },
  plotOptions: { bar: { borderRadius: 5, horizontal: true } },
  dataLabels: { enabled: false },
  legend: { show: false },
}))

// Stacked approved vs declined by host
const stackedSeries = computed(() => {
  const hosts = ['EXPRESS_PAY', 'KIMONO', 'MEDUSA', 'NIBSS']
  return [
    { name: 'Approved', data: hosts.map(h => history.value.filter(t => t.host?.toUpperCase() === h && t.status === 'Approved').length) },
    { name: 'Declined', data: hosts.map(h => history.value.filter(t => t.host?.toUpperCase() === h && t.status !== 'Approved').length) },
  ]
})
const stackedOpts = computed(() => ({
  ...darkChartBase,
  colors: ['#4ade80', '#f87171'],
  xaxis:  { categories: ['ExpressPay', 'Kimono', 'Medusa', 'NIBSS'], labels: { style: { colors: '#8899aa' } } },
  yaxis:  { labels: { style: { colors: '#8899aa' } } },
  plotOptions: { bar: { borderRadius: 4, stacked: true } },
  chart:  { ...darkChartBase.chart, stacked: true },
  legend: { position: 'top', labels: { colors: '#8899aa' } },
  dataLabels: { enabled: false },
}))

// ── Helpers ────────────────────────────────────────────────────────
const hostColor     = h => h === 'KIMONO' ? 'purple-10' : h === 'MEDUSA' ? 'cyan-10' : h === 'NIBSS' ? 'amber-10' : 'green-10'
const hostTextColor = h => h === 'KIMONO' ? 'purple-3'  : h === 'MEDUSA' ? 'cyan-3'  : h === 'NIBSS' ? 'amber-3'  : 'green-3'
const hostIcon      = h => h === 'KIMONO' ? 'cloud'     : h === 'MEDUSA' ? 'settings_input_component' : h === 'NIBSS' ? 'account_balance' : 'payments'

// ── API calls ──────────────────────────────────────────────────────
const loadAll = async () => {
  loading.value = true
  try {
    const [cfgRes, histRes, obsRes] = await Promise.all([
      posApi.getRoutingConfig(),
      posApi.getHistory(),
      posApi.getObservabilityMetrics()
    ])
    config.value  = cfgRes.data || {}
    history.value = histRes.data || []
    metrics.value = obsRes.data || {}
    
    try {
      const aRes = await adminApi.listAgents({ limit: 100 })
      agentOptions.value = aRes.data?.data || aRes.data || []
    } catch(e) {}
    try {
      const tRes = await adminApi.getTenants({ limit: 100 })
      tenantOptions.value = tRes.data?.data || tRes.data || []
    } catch(e) {}
    
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Failed to load POS data: ' + e.message })
  } finally {
    loading.value = false
  }
}

const saveConfig = async (reason = 'Updated POS routing configuration') => {
  try {
    await posApi.updateRoutingConfig({
      config: config.value,
      adminId: 'SuperAdmin',
      reason
    })
    $q.notify({ type: 'positive', message: 'Switchboard configuration saved & broadcasted.' })
    // Reload to update audit trail and metrics
    const obsRes = await posApi.getObservabilityMetrics()
    metrics.value = obsRes.data || {}
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Failed to save config: ' + e.message })
  }
}

const openHostDrawer = (code) => {
  if (!config.value.hosts) config.value.hosts = []
  let host = config.value.hosts.find(h => h.hostCode === code)
  if (!host) {
    host = { hostCode: code, isActive: false, ip: '', port: 0 }
    config.value.hosts.push(host)
  }
  
  if (host) {
    // Deep clone host configuration for editing
    editingHost.value = JSON.parse(JSON.stringify(host))
    if (!editingHost.value.kimonoKeys) editingHost.value.kimonoKeys = { masterKey: '[SECRET_MASKED]', pinKey: '[SECRET_MASKED]', ctmk: '[SECRET_MASKED]' }
    if (!editingHost.value.kimonoFallbackParameters) {
      editingHost.value.kimonoFallbackParameters = { merchantId: '', uniqueId: '', institutionId: '', settlementAccount: '', keyLabel: '', token: '[SECRET_MASKED]' }
    }
    if (editingHost.value.hostCode === 'nibss') {
      if (!editingHost.value.nibssConfig) editingHost.value.nibssConfig = { institutionCode: '', terminalId: '', merchantId: '', ctmk: '[SECRET_MASKED]', ptspCode: 'GA' }
      if (!editingHost.value.nibssConfig.ctmk) editingHost.value.nibssConfig.ctmk = '[SECRET_MASKED]'
      
      // Default NIBSS Prod Parameters
      if (!editingHost.value.ip) editingHost.value.ip = '196.6.103.18'
      if (!editingHost.value.port) editingHost.value.port = 4018
      if (!editingHost.value.timeoutSeconds) editingHost.value.timeoutSeconds = 30
      if (typeof editingHost.value.sslEnabled !== 'boolean') editingHost.value.sslEnabled = false
    }
    showHostDrawer.value = true
  }
}

const saveHostDetails = async () => {
  try {
    const priorityConflict = config.value.hosts.some(h => h.hostCode !== editingHost.value.hostCode && h.priority === editingHost.value.priority && editingHost.value.priority != null);
    if (priorityConflict) {
      $q.notify({ type: 'warning', message: 'Cannot save: Another host already has this priority. Priority must be unique.' })
      return
    }

    const hostIndex = config.value.hosts.findIndex(h => h.hostCode === editingHost.value.hostCode)
    if (hostIndex !== -1) {
      const updatedHost = { ...editingHost.value }
      // Clean up masked secrets to prevent double encryption of masked strings
      if (updatedHost.authToken === '[SECRET_MASKED]') delete updatedHost.authToken
      if (updatedHost.kimonoKeys) {
        if (updatedHost.kimonoKeys.masterKey === '[SECRET_MASKED]') delete updatedHost.kimonoKeys.masterKey
        if (updatedHost.kimonoKeys.pinKey === '[SECRET_MASKED]') delete updatedHost.kimonoKeys.pinKey
        if (updatedHost.kimonoKeys.ctmk === '[SECRET_MASKED]') delete updatedHost.kimonoKeys.ctmk
      }
      if (updatedHost.kimonoFallbackParameters && updatedHost.kimonoFallbackParameters.token === '[SECRET_MASKED]') {
        delete updatedHost.kimonoFallbackParameters.token
      }
      if (updatedHost.nibssConfig && updatedHost.nibssConfig.ctmk === '[SECRET_MASKED]') {
        delete updatedHost.nibssConfig.ctmk
      }

      config.value.hosts[hostIndex] = updatedHost
      // Sort the hosts by Priority so the highest priority (e.g. 1) becomes the Primary Host in [0]
      config.value.hosts.sort((a, b) => (a.priority || 99) - (b.priority || 99))
      
      // Update activeHost to match the newly sorted primary host (if any)
      const actives = config.value.hosts.filter(h => h.isActive)
      config.value.activeHost = actives.length > 0 ? actives[0].hostCode : ''

      await saveConfig(`Modified host settings for ${editingHost.value.hostName}`)
      showHostDrawer.value = false
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Failed to save host settings: ' + e.message })
  }
}

// Matrix Rules
const openMatrixRuleDialog = (rule = null) => {
  if (rule) {
    editingMatrixRule.value = rule
    matrixRuleForm.value = { ...rule }
  } else {
    editingMatrixRule.value = null
    matrixRuleForm.value = { minAmount: 0, maxAmount: 100000, preferredHost: 'express_pay' }
  }
  showMatrixDialog.value = true
}

const saveMatrixRule = async () => {
  if (!config.value.thresholdRulesMatrix) config.value.thresholdRulesMatrix = []
  if (editingMatrixRule.value) {
    const idx = config.value.thresholdRulesMatrix.findIndex(r => r.minAmount === editingMatrixRule.value.minAmount)
    if (idx !== -1) config.value.thresholdRulesMatrix[idx] = { ...matrixRuleForm.value }
  } else {
    config.value.thresholdRulesMatrix.push({ ...matrixRuleForm.value })
  }
  await saveConfig('Updated threshold rules matrix')
  showMatrixDialog.value = false
}

const deleteMatrixRule = async (rule) => {
  config.value.thresholdRulesMatrix = config.value.thresholdRulesMatrix.filter(
    r => r.minAmount !== rule.minAmount
  )
  await saveConfig('Deleted matrix rule')
}

// Tenant Profiles
const openProfileDialog = (profile = null) => {
  if (profile) {
    editingProfile.value = profile
    profileForm.value = { processOnDevice: false, webhookUrl: '', scopeType: 'Category', targetValue: profile.category || '', ...profile }
  } else {
    editingProfile.value = null
    profileForm.value = { profileId: 'prof_' + Date.now(), scopeType: 'Category', targetValue: 'Retail', category: 'Retail', preferredHosts: [], fallbackHosts: [], processOnDevice: false, webhookUrl: '' }
  }
  showProfileDialog.value = true
}

const saveProfile = async () => {
  if (!config.value.tenantRoutingProfiles) config.value.tenantRoutingProfiles = []
  
  if (!profileForm.value.profileId) profileForm.value.profileId = 'prof_' + Date.now()
  if (profileForm.value.scopeType === 'Category') profileForm.value.category = profileForm.value.targetValue
  
  if (editingProfile.value) {
    const idx = config.value.tenantRoutingProfiles.findIndex(p => p.profileId === editingProfile.value.profileId || (p.category && p.category === editingProfile.value.category))
    if (idx !== -1) config.value.tenantRoutingProfiles[idx] = { ...profileForm.value }
  } else {
    config.value.tenantRoutingProfiles.push({ ...profileForm.value })
  }
  await saveConfig(`Updated routing profile for ${profileForm.value.targetValue || profileForm.value.category}`)
  showProfileDialog.value = false
}

const deleteProfile = async (profile) => {
  config.value.tenantRoutingProfiles = config.value.tenantRoutingProfiles.filter(
    p => !(p.profileId === profile.profileId || (p.category && p.category === profile.category))
  )
  await saveConfig(`Deleted routing profile for ${profile.targetValue || profile.category}`)
}

// Live Simulation
const runSimulation = async () => {
  try {
    const res = await posApi.simulateRoute({
      amount: simData.value.amount,
      tenantCategory: simData.value.tenantCategory,
      transactionType: simData.value.transactionType,
      cardScheme: simData.value.cardScheme,
      hostHealthOverrides: simData.value.hostHealthOverrides
    })
    simResult.value = res.data
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Simulation failed: ' + e.message })
  }
}

const viewTxDetail = row => { selectedTx.value = row; showTxDialog.value = true }

onMounted(loadAll)
</script>

<style scoped>
.bg-dark-main {
  background-color: #0c111d !important;
}
.tab-bar {
  border: 1px solid rgba(167, 139, 250, 0.15);
  background: rgba(30, 41, 59, 0.2);
  border-radius: 8px;
}
.font-mono {
  font-family: 'Fira Code', 'Courier New', monospace;
}
pre {
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.75rem;
  margin: 0;
}
.bg-panel {
  background: rgba(17, 24, 39, 0.7) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(167, 139, 250, 0.12);
  border-radius: 12px;
}
.bg-subpanel {
  background: rgba(31, 41, 55, 0.5) !important;
  border-bottom: 1px solid rgba(167, 139, 250, 0.08);
}
.border-main {
  border: 1px solid rgba(167, 139, 250, 0.12) !important;
}
.text-main {
  color: #f3f4f6;
}
.text-glow {
  text-shadow: 0 0 10px rgba(167, 139, 250, 0.3);
}
.border-purple-glow {
  border-color: rgba(167, 139, 250, 0.4) !important;
  box-shadow: 0 0 12px rgba(167, 139, 250, 0.15);
}
.border-green-glow {
  border-color: rgba(74, 222, 128, 0.4) !important;
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.15);
}
.active-ribbon {
  position: absolute;
  top: 0;
  right: 12px;
  padding: 2px 8px;
  font-size: 9px;
  font-weight: bold;
  border-radius: 0 0 4px 4px;
  color: #000;
  letter-spacing: 0.5px;
}
.border-bottom-pulse {
  border-bottom: 1px solid rgba(167, 139, 250, 0.15);
  padding-bottom: 12px;
}
/* Micro-animations */
.animate-hover {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.animate-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4) !important;
  border-color: rgba(167, 139, 250, 0.25) !important;
}
</style>


