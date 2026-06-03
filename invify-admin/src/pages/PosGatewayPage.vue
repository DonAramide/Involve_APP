<template>
  <q-page class="q-pa-md text-main">

    <!-- ── Header ─────────────────────────────────────────────────── -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h4 text-weight-bold" style="color:#a78bfa">EMV POS Gateway</div>
        <div class="text-caption text-secondary">Hardware Level Socket Routing &amp; Transaction Insights</div>
      </div>
      <div class="col-auto row q-gutter-sm">
        <q-btn unelevated color="purple-8" icon="refresh" label="Refresh" @click="loadAll" :loading="loading" :dark="prefs.isDarkMode" />
      </div>
    </div>

    <!-- ── Tabs ────────────────────────────────────────────────────── -->
    <q-tabs
      v-model="activeTab"
      dense align="left"
      active-color="cyan-4"
      indicator-color="cyan-4"
      class="text-grey-5 q-mb-md tab-bar"
      :dark="prefs.isDarkMode"
    >
      <q-tab name="routing"      icon="alt_route"      label="Dynamic Host Routing Strategy" />
      <q-tab name="analytics"    icon="show_chart"     label="Analytics &amp; Charts" />
      <q-tab name="transactions" icon="receipt_long"   label="Recent Transactions (ISO8583)" />
    </q-tabs>

    <q-separator color="purple-10" class="q-mb-lg" />

    <q-tab-panels v-model="activeTab" animated keep-alive class="bg-transparent">

      <!-- ════════════════════════════════════════════════════════════
           TAB 1 — DYNAMIC HOST ROUTING STRATEGY
           ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="routing" class="q-pa-none">

        <div class="row q-col-gutter-md q-mb-md">

          <!-- Active Host Toggle -->
          <div class="col-12 col-md-5">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-caption text-secondary text-weight-bold q-mb-sm">ACTIVE ROUTE</div>
                <q-btn-group unelevated class="full-width">
                  <q-btn
                    :color="config.activeHost === 'kimono' ? 'purple-8' : 'grey-9'"
                    :text-color="config.activeHost === 'kimono' ? 'purple-2' : 'grey-4'"
                    label="KIMONO" icon="cloud" class="col"
                    @click="setActiveHost('kimono')" :dark="prefs.isDarkMode" />
                  <q-btn
                    :color="config.activeHost === 'medusa' ? 'cyan-9' : 'grey-9'"
                    :text-color="config.activeHost === 'medusa' ? 'cyan-2' : 'grey-4'"
                    label="MEDUSA" icon="settings_input_component" class="col"
                    @click="setActiveHost('medusa')" :dark="prefs.isDarkMode" />
                  <q-btn
                    :color="config.activeHost === 'nibss' ? 'amber-9' : 'grey-9'"
                    :text-color="config.activeHost === 'nibss' ? 'amber-2' : 'grey-4'"
                    label="NIBSS" icon="account_balance" class="col"
                    @click="setActiveHost('nibss')" :dark="prefs.isDarkMode" />
                </q-btn-group>

                <!-- Threshold -->
                <div class="q-mt-md">
                  <div class="text-caption text-secondary text-weight-bold q-mb-xs">
                    ROUTING SPLIT THRESHOLD
                    <q-icon name="help_outline" size="xs" color="grey-5" class="q-ml-xs">
                      <q-tooltip max-width="220px" class="text-caption">
                        When toggle is NOT Kimono:<br>
                        • Amount &lt; threshold → <b>Medusa</b><br>
                        • Amount ≥ threshold → <b>Kimono</b>
                      </q-tooltip>
                    </q-icon>
                  </div>
                  <div class="row items-center q-gutter-sm">
                    <q-input
                      v-model.number="config.splitThresholdNaira"
                      type="number" dense filled :prefix="currentCurrency.symbol" suffix="NGN"
                      style="max-width:160px"
                      :dark="prefs.isDarkMode" hide-bottom-space
                      :rules="[v => v > 0 || 'Must be > 0']"
                      @blur="saveConfig"
                    />
                    <div class="text-caption text-secondary">
                      &lt;{{ currentCurrency.symbol }}{{ Number(config.splitThresholdNaira || 50000).toLocaleString() }} → Medusa<br>
                      ≥{{ currentCurrency.symbol }}{{ Number(config.splitThresholdNaira || 50000).toLocaleString() }} → Kimono
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Host Status Cards -->
          <div class="col-12 col-md-7">
            <div class="row q-col-gutter-md full-height">
              <div class="col-4" v-for="h in hostDefs" :key="h.key">
                <q-card class="bg-panel border-main full-height" flat :dark="prefs.isDarkMode"
                  :style="config[h.key]?.isActive ? `border-color:${h.glowColor};box-shadow:0 0 16px ${h.glowColor}22` : ''">
                  <q-card-section class="q-pa-md">
                    <div class="row items-center q-mb-sm">
                      <q-icon :name="h.icon" :color="h.color" size="1.4em" class="q-mr-sm" />
                      <div class="col">
                        <div class="text-subtitle2 text-weight-bold" :style="`color:${h.glowColor}`">{{ h.label }}</div>
                        <div class="text-caption text-secondary">{{ h.proto }}</div>
                      </div>
                      <q-badge
                        :color="config[h.key]?.isActive ? 'green-10' : 'red-10'"
                        :text-color="config[h.key]?.isActive ? 'green-4' : 'red-4'"
                        class="text-weight-bold text-caption"
                      >{{ config[h.key]?.isActive ? 'ONLINE' : 'OFFLINE' }}</q-badge>
                    </div>
                    <div class="text-caption font-mono text-secondary q-mb-sm" style="word-break:break-all">
                      {{ h.key === 'kimono' ? (config.kimono?.baseUrl || '—') : `${config[h.key]?.host || '—'}:${config[h.key]?.port || '—'}` }}
                    </div>
                    <q-chip dense square
                      :color="config.activeHost === h.key ? h.chipBg : 'grey-10'"
                      :text-color="config.activeHost === h.key ? h.chipText : 'grey-5'"
                      icon="bolt" class="text-weight-bold text-caption q-mb-sm"
                    >
                      {{ config.activeHost === h.key ? 'ACTIVE ROUTE' : 'FALLBACK' }}
                    </q-chip>
                    <div class="row items-center justify-between">
                      <q-btn flat dense size="sm" :label="'Set Active'" :color="h.color"
                        :disable="config.activeHost === h.key"
                        @click="setActiveHost(h.key)" :dark="prefs.isDarkMode" />
                      <q-toggle v-model="config[h.key].isActive" :color="h.color" label="Enable" dense
                        @update:model-value="saveConfig" :dark="prefs.isDarkMode" />
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>
        </div>

        <!-- Failover Banner -->
        <q-banner class="bg-panel border-main rounded-borders q-mb-md" :dark="prefs.isDarkMode">
          <template v-slot:avatar><q-icon name="alt_route" color="purple-4" /></template>
          <div class="row items-center q-gutter-sm no-wrap flex-wrap">
            <span class="text-caption text-secondary text-weight-bold">FAILOVER ORDER:</span>
            <template v-for="(host, i) in config.failoverOrder" :key="host">
              <q-chip dense square
                :color="host === config.activeHost ? 'purple-10' : 'grey-10'"
                :text-color="host === config.activeHost ? 'purple-3' : 'grey-5'"
                class="text-weight-bold text-caption font-mono"
              >{{ i + 1 }}. {{ host.toUpperCase() }}</q-chip>
              <q-icon v-if="i < config.failoverOrder.length - 1" name="arrow_forward" size="xs" color="grey-6" />
            </template>
            <q-space />
            <q-btn flat dense size="sm" color="purple-4" label="Refresh Kimono Keys" icon="vpn_key"
              @click="showRefreshKeyDialog = true" :dark="prefs.isDarkMode" />
          </div>
        </q-banner>

      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════
           TAB 2 — ANALYTICS & CHARTS
           ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="analytics" class="q-pa-none">

        <!-- Summary KPI Row -->
        <div class="row q-col-gutter-md q-mb-lg">
          <div class="col-6 col-sm-3" v-for="kpi in kpiCards" :key="kpi.label">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="row items-center q-mb-xs">
                  <q-icon :name="kpi.icon" :color="kpi.color" size="1.5em" class="q-mr-sm" />
                  <div class="text-caption text-secondary">{{ kpi.label }}</div>
                </div>
                <div class="text-h5 text-weight-bold" :style="`color:${kpi.valueColor}`">{{ kpi.value }}</div>
                <div class="text-caption text-secondary">{{ kpi.sub }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Charts Row 1 -->
        <div class="row q-col-gutter-md q-mb-md">

          <!-- Transaction Volume over time (Area) -->
          <div class="col-12 col-md-8">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-purple-4 q-mb-sm">
                  <q-icon name="show_chart" class="q-mr-xs" />Transaction Volume (Last 7 Days)
                </div>
                <apexchart type="area" height="220" :options="volumeChartOpts" :series="volumeSeries" />
              </q-card-section>
            </q-card>
          </div>

          <!-- Approval Rate Donut -->
          <div class="col-12 col-md-4">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-purple-4 q-mb-sm">
                  <q-icon name="donut_large" class="q-mr-xs" />Approval Rate
                </div>
                <apexchart type="donut" height="220" :options="approvalChartOpts" :series="approvalSeries" />
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Charts Row 2 -->
        <div class="row q-col-gutter-md">

          <!-- Transactions by Host (Bar) -->
          <div class="col-12 col-md-4">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-cyan-4 q-mb-sm">
                  <q-icon name="bar_chart" class="q-mr-xs" />Txns by Host
                </div>
                <apexchart type="bar" height="220" :options="hostBarOpts" :series="hostBarSeries" />
              </q-card-section>
            </q-card>
          </div>

          <!-- Avg Amount by Host (Horizontal Bar) -->
          <div class="col-12 col-md-4">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-amber-4 q-mb-sm">
                  <q-icon name="payments" class="q-mr-xs" />Avg Amount by Host (₦)
                </div>
                <apexchart type="bar" height="220" :options="avgAmountOpts" :series="avgAmountSeries" />
              </q-card-section>
            </q-card>
          </div>

          <!-- Approved vs Declined by Host (Stacked Bar) -->
          <div class="col-12 col-md-4">
            <q-card class="bg-panel border-main" flat :dark="prefs.isDarkMode">
              <q-card-section class="q-pa-md">
                <div class="text-subtitle2 text-weight-bold text-green-4 q-mb-sm">
                  <q-icon name="stacked_bar_chart" class="q-mr-xs" />Approved vs Declined by Host
                </div>
                <apexchart type="bar" height="220" :options="stackedOpts" :series="stackedSeries" />
              </q-card-section>
            </q-card>
          </div>
        </div>

      </q-tab-panel>

      <!-- ════════════════════════════════════════════════════════════
           TAB 3 — RECENT TRANSACTIONS
           ════════════════════════════════════════════════════════════ -->
      <q-tab-panel name="transactions" class="q-pa-none">

        <!-- Filter Bar -->
        <q-card class="bg-panel border-main q-mb-md" flat :dark="prefs.isDarkMode">
          <q-card-section class="q-pa-md">
            <div class="row q-col-gutter-sm items-end">
              <!-- Business Owner -->
              <div class="col-12 col-sm-6 col-md-2">
                <q-input v-model="fTenant" dense filled clearable label="Business Owner"
                  prepend-icon="business" :dark="prefs.isDarkMode" />
              </div>
              <!-- Amount Greater Than -->
              <div class="col-12 col-sm-6 col-md-2">
                <q-input v-model.number="fAmountMin" type="number" dense filled clearable
                  label="Amount Greater (₦)" :prefix="currentCurrency.symbol" :dark="prefs.isDarkMode" />
              </div>
              <!-- Amount Less Than -->
              <div class="col-12 col-sm-6 col-md-2">
                <q-input v-model.number="fAmountMax" type="number" dense filled clearable
                  label="Amount Less (₦)" :prefix="currentCurrency.symbol" :dark="prefs.isDarkMode" />
              </div>
              <!-- Date -->
              <div class="col-12 col-sm-6 col-md-2">
                <q-input v-model="fDate" dense filled clearable label="Date (YYYY-MM-DD)"
                  :dark="prefs.isDarkMode">
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
              <!-- Host -->
              <div class="col-12 col-sm-6 col-md-2">
                <q-select v-model="fHost" :options="['All','KIMONO','MEDUSA','NIBSS']"
                  dense filled label="Host" :dark="prefs.isDarkMode" />
              </div>
              <!-- Status -->
              <div class="col-12 col-sm-6 col-md-1">
                <q-select v-model="fStatus" :options="['All','Approved','Declined']"
                  dense filled label="Status" :dark="prefs.isDarkMode" />
              </div>
              <!-- RRN / STAN search -->
              <div class="col-12 col-sm-6 col-md-1">
                <q-input v-model="fSearch" dense filled clearable label="RRN / STAN"
                  :dark="prefs.isDarkMode">
                  <template v-slot:append><q-icon name="search" color="purple-4" /></template>
                </q-input>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Table -->
        <div class="text-subtitle2 text-weight-bold text-purple-4 q-mb-sm row items-center">
          <q-icon name="receipt_long" class="q-mr-sm" />Recent Socket Transactions (ISO8583)
          <q-chip dense square color="purple-10" text-color="purple-3" class="q-ml-md">
            {{ filteredHistory.length }} records
          </q-chip>
          <q-space />
          <q-btn flat dense size="sm" icon="download" label="Export CSV" color="grey-5"
            @click="exportCsv" :dark="prefs.isDarkMode" />
        </div>

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
                :icon="hostIcon(props.value)" class="text-weight-bold text-caption">
                {{ props.value }}
              </q-chip>
            </q-td>
          </template>
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="props.value === 'Approved' ? 'green-10' : 'red-10'"
                :text-color="props.value === 'Approved' ? 'green-4' : 'red-4'" class="text-weight-bold">
                {{ props.value.toUpperCase() }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-statusCode="props">
            <q-td :props="props">
              <span class="font-mono text-weight-bold"
                :class="props.value === '00' ? 'text-green-4' : 'text-red-4'">{{ props.value }}</span>
            </q-td>
          </template>
          <template v-slot:body-cell-amount="props">
            <q-td :props="props">
              <span class="text-weight-bold">{{ currentCurrency.symbol }}{{ Number(props.value).toLocaleString() }}</span>
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
    </q-tab-panels>

    <!-- ── Key Refresh Dialog ────────────────────────────────────── -->
    <q-dialog v-model="showRefreshKeyDialog" :dark="prefs.isDarkMode">
      <q-card style="min-width:380px" class="bg-panel text-main border-main" :dark="prefs.isDarkMode">
        <q-card-section class="bg-subpanel text-purple-4 text-weight-bold">
          <q-icon name="vpn_key" class="q-mr-sm" />Refresh Kimono Terminal Keys
        </q-card-section>
        <q-card-section>
          <p class="text-caption text-secondary q-mb-md">
            Force-refresh cached IPEK / KSN / TMK from Cpoint for a terminal after key rotation.
          </p>
          <q-input v-model="refreshTerminalId" label="Terminal ID" filled :dark="prefs.isDarkMode" />
        </q-card-section>
        <q-card-actions align="right" class="bg-subpanel">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup :dark="prefs.isDarkMode" />
          <q-btn unelevated color="purple-7" label="Refresh Keys" @click="doRefreshKeys" :loading="refreshing" :dark="prefs.isDarkMode" />
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
            :text-color="selectedTx?.status === 'Approved' ? 'green-4' : 'red-4'" class="text-weight-bold">
            {{ selectedTx?.status?.toUpperCase() }}
          </q-badge>
        </q-card-section>
        <q-card-section v-if="selectedTx" class="q-pa-lg">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-6"><div class="text-caption text-secondary">Host</div><div class="font-mono text-weight-bold">{{ selectedTx.host }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">Response Code</div>
              <div class="font-mono text-weight-bold" :class="selectedTx.statusCode === '00' ? 'text-green-4' : 'text-red-4'">{{ selectedTx.statusCode }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">Amount</div><div class="text-weight-bold">{{ currentCurrency.symbol }}{{ Number(selectedTx.amount).toLocaleString() }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">Terminal</div><div class="font-mono text-weight-bold">{{ selectedTx.terminalId }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">RRN</div><div class="font-mono text-weight-bold">{{ selectedTx.rrn }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">STAN</div><div class="font-mono text-weight-bold">{{ selectedTx.stan }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">Card</div><div class="font-mono text-weight-bold">{{ selectedTx.maskedPan }}</div></div>
            <div class="col-6"><div class="text-caption text-secondary">Tenant</div><div class="font-mono text-weight-bold">{{ selectedTx.tenantId || '—' }}</div></div>
            <div class="col-12">
              <div class="text-caption text-secondary q-mb-xs">Raw Request</div>
              <pre class="bg-subpanel rounded-borders q-pa-sm text-caption font-mono" style="max-height:120px;overflow:auto;white-space:pre-wrap">{{ selectedTx.rawRequest }}</pre>
            </div>
            <div class="col-12">
              <div class="text-caption text-secondary q-mb-xs">Raw Response</div>
              <pre class="bg-subpanel rounded-borders q-pa-sm text-caption font-mono" style="max-height:120px;overflow:auto;white-space:pre-wrap">{{ selectedTx.rawResponse }}</pre>
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

import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useOperatorPreferences } from '../composables/useOperatorPreferences'
import { posApi } from '../api'
import ApexCharts from 'vue3-apexcharts'

const apexchart = ApexCharts

const $q      = useQuasar()
const { prefs } = useOperatorPreferences()

// ── State ──────────────────────────────────────────────────────────
const activeTab  = ref('routing')
const loading    = ref(false)
const refreshing = ref(false)
const history    = ref([])
const showRefreshKeyDialog = ref(false)
const refreshTerminalId    = ref('')
const showTxDialog = ref(false)
const selectedTx   = ref(null)

// Filters (tab 3)
const fTenant    = ref('')
const fAmountMin = ref(null)
const fAmountMax = ref(null)
const fDate      = ref('')
const fHost      = ref('All')
const fStatus    = ref('All')
const fSearch    = ref('')

const config = ref({
  activeHost: 'kimono',
  failoverOrder: ['kimono', 'medusa', 'nibss'],
  splitThresholdNaira: 50000,
  kimono: { baseUrl: '', isActive: true,  thresholdAmount: 0 },
  medusa: { host: '', port: 8080, isActive: true,  thresholdAmount: 0 },
  nibss:  { host: '', port: 5000, isActive: false, thresholdAmount: 0 },
})

// ── Host definitions ───────────────────────────────────────────────
const hostDefs = [
  { key: 'kimono', label: 'Cpoint-Kimono', proto: 'HTTPS REST · Interswitch',    icon: 'cloud',                    color: 'purple-4', glowColor: '#a78bfa', chipBg: 'purple-10', chipText: 'purple-3' },
  { key: 'medusa', label: 'Medusa',        proto: 'ISO8583 · TCP Socket',         icon: 'settings_input_component', color: 'cyan-4',   glowColor: '#22d3ee', chipBg: 'cyan-10',   chipText: 'cyan-3'   },
  { key: 'nibss',  label: 'NIBSS',         proto: 'ISO8583 · TCP Socket',         icon: 'account_balance',          color: 'amber-4',  glowColor: '#fbbf24', chipBg: 'amber-10',  chipText: 'amber-3'  },
]

// ── Columns ────────────────────────────────────────────────────────
const txColumns = [
  { name: 'date',       label: 'Date',        field: r => new Date(r.date).toLocaleString(), align: 'left',   sortable: true },
  { name: 'tenantId',   label: 'Business Owner', field: 'tenantId',   align: 'left'   },
  { name: 'terminalId', label: 'Terminal ID',  field: 'terminalId',   align: 'left'   },
  { name: 'host',       label: 'Routed Host',  field: 'host',         align: 'center' },
  { name: 'amount',     label: 'Amount',       field: 'amount',       align: 'right',  sortable: true },
  { name: 'maskedPan',  label: 'Card PAN',     field: 'maskedPan',    align: 'left'   },
  { name: 'statusCode', label: 'Code',         field: 'statusCode',   align: 'center' },
  { name: 'status',     label: 'Status',       field: 'status',       align: 'center', sortable: true },
  { name: 'actions',    label: 'Trace',        field: 'actions',      align: 'center' },
]

// ── Filtered history ───────────────────────────────────────────────
const filteredHistory = computed(() => history.value.filter(tx => {
  if (fTenant.value    && !String(tx.tenantId || '').toLowerCase().includes(fTenant.value.toLowerCase())) return false
  if (fAmountMin.value && tx.amount < fAmountMin.value) return false
  if (fAmountMax.value && tx.amount > fAmountMax.value) return false
  if (fDate.value      && !new Date(tx.date).toISOString().startsWith(fDate.value))                        return false
  if (fHost.value !== 'All'   && tx.host   !== fHost.value)   return false
  if (fStatus.value !== 'All' && tx.status !== fStatus.value) return false
  if (fSearch.value) {
    const q = fSearch.value.toLowerCase()
    if (!String(tx.rrn || '').toLowerCase().includes(q) && !String(tx.stan || '').toLowerCase().includes(q)) return false
  }
  return true
}))

// ── KPI cards ──────────────────────────────────────────────────────
const kpiCards = computed(() => {
  const all      = history.value
  const approved = all.filter(t => t.status === 'Approved')
  const declined = all.filter(t => t.status !== 'Approved')
  const total    = all.reduce((s, t) => s + (t.amount || 0), 0)
  const rate     = all.length ? ((approved.length / all.length) * 100).toFixed(1) : '0.0'
  return [
    { label: 'Total Transactions', value: all.length,                           sub: 'All time in-memory',        icon: 'receipt_long',   color: 'purple-4', valueColor: '#a78bfa' },
    { label: 'Total Volume',       value: `${currentCurrency.symbol}${total.toLocaleString()}`,          sub: 'Sum of all amounts',        icon: 'payments',       color: 'teal-4',   valueColor: '#2dd4bf' },
    { label: 'Approval Rate',      value: `${rate}%`,                            sub: `${approved.length} approved`, icon: 'check_circle', color: 'green-4',  valueColor: '#4ade80' },
    { label: 'Declined',           value: declined.length,                       sub: `${declined.length} failed`, icon: 'cancel',         color: 'red-4',    valueColor: '#f87171' },
  ]
})

// ── Chart helpers ──────────────────────────────────────────────────
const darkChartBase = {
  chart:    { background: 'transparent', toolbar: { show: false }, animations: { enabled: true, easing: 'easeinout', speed: 600 } },
  theme:    { mode: 'dark' },
  grid:     { borderColor: '#1e2a3a', strokeDashArray: 4 },
  tooltip:  { theme: 'dark' },
}

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
  const hosts = ['KIMONO', 'MEDUSA', 'NIBSS']
  return [{ name: 'Transactions', data: hosts.map(h => history.value.filter(t => t.host === h).length) }]
})
const hostBarOpts = computed(() => ({
  ...darkChartBase,
  colors: ['#a78bfa', '#22d3ee', '#fbbf24'],
  xaxis:  { categories: ['Kimono', 'Medusa', 'NIBSS'], labels: { style: { colors: '#8899aa' } } },
  yaxis:  { labels: { style: { colors: '#8899aa' } } },
  plotOptions: { bar: { borderRadius: 5, distributed: true } },
  legend: { show: false },
  dataLabels: { enabled: true, style: { colors: ['#fff'] } },
}))

// Avg amount by host
const avgAmountSeries = computed(() => {
  const hosts = ['KIMONO', 'MEDUSA', 'NIBSS']
  return [{ name: 'Avg {{ currentCurrency.symbol }}', data: hosts.map(h => {
    const txs = history.value.filter(t => t.host === h)
    return txs.length ? Math.round(txs.reduce((s, t) => s + (t.amount || 0), 0) / txs.length) : 0
  })}]
})
const avgAmountOpts = computed(() => ({
  ...darkChartBase,
  colors: ['#fbbf24'],
  xaxis:  { categories: ['Kimono', 'Medusa', 'NIBSS'], labels: { style: { colors: '#8899aa' } } },
  yaxis:  { labels: { formatter: v => `${currentCurrency.symbol}${v.toLocaleString()}`, style: { colors: '#8899aa' } } },
  plotOptions: { bar: { borderRadius: 5, horizontal: true } },
  dataLabels: { enabled: false },
  legend: { show: false },
}))

// Stacked approved vs declined by host
const stackedSeries = computed(() => {
  const hosts = ['KIMONO', 'MEDUSA', 'NIBSS']
  return [
    { name: 'Approved', data: hosts.map(h => history.value.filter(t => t.host === h && t.status === 'Approved').length) },
    { name: 'Declined', data: hosts.map(h => history.value.filter(t => t.host === h && t.status !== 'Approved').length) },
  ]
})
const stackedOpts = computed(() => ({
  ...darkChartBase,
  colors: ['#4ade80', '#f87171'],
  xaxis:  { categories: ['Kimono', 'Medusa', 'NIBSS'], labels: { style: { colors: '#8899aa' } } },
  yaxis:  { labels: { style: { colors: '#8899aa' } } },
  plotOptions: { bar: { borderRadius: 4, stacked: true } },
  chart:  { ...darkChartBase.chart, stacked: true },
  legend: { position: 'top', labels: { colors: '#8899aa' } },
  dataLabels: { enabled: false },
}))

// ── Helpers ────────────────────────────────────────────────────────
const hostColor     = h => h === 'KIMONO' ? 'purple-10' : h === 'MEDUSA' ? 'cyan-10' : 'amber-10'
const hostTextColor = h => h === 'KIMONO' ? 'purple-3'  : h === 'MEDUSA' ? 'cyan-3'  : 'amber-3'
const hostIcon      = h => h === 'KIMONO' ? 'cloud'     : h === 'MEDUSA' ? 'settings_input_component' : 'account_balance'

// ── API calls ──────────────────────────────────────────────────────
const loadAll = async () => {
  loading.value = true
  try {
    const [cfgRes, histRes] = await Promise.all([
      posApi.getRoutingConfig(),
      posApi.getHistory(),
    ])
    config.value  = { splitThresholdNaira: 50000, ...cfgRes.data }
    history.value = histRes.data || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Failed to load POS data: ' + e.message })
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  try {
    await posApi.updateRoutingConfig(config.value)
    $q.notify({ type: 'positive', message: 'Routing config saved.' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Save failed: ' + e.message })
  }
}

const setActiveHost = async host => {
  config.value.activeHost = host
  await saveConfig()
}

const doRefreshKeys = async () => {
  if (!refreshTerminalId.value) return
  refreshing.value = true
  try {
    await posApi.refreshKimonoParams(refreshTerminalId.value)
    $q.notify({ type: 'positive', message: `Keys refreshed for ${refreshTerminalId.value}` })
    showRefreshKeyDialog.value = false
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Refresh failed: ' + e.message })
  } finally {
    refreshing.value = false
  }
}

const viewTxDetail = row => { selectedTx.value = row; showTxDialog.value = true }

// CSV Export
const exportCsv = () => {
  const headers = ['Date','Tenant','Terminal','Host','Amount','PAN','RRN','STAN','Code','Status']
  const rows = filteredHistory.value.map(t => [
    new Date(t.date).toLocaleString(), t.tenantId, t.terminalId,
    t.host, t.amount, t.maskedPan, t.rrn, t.stan, t.statusCode, t.status
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = 'pos_transactions.csv'; a.click()
  URL.revokeObjectURL(url)
}

onMounted(loadAll)
</script>

<style scoped>
.tab-bar { border-bottom: 1px solid rgba(167,139,250,0.15); }
.font-mono { font-family: 'Courier New', Courier, monospace; }
pre { font-family: 'Courier New', Courier, monospace; font-size: 0.75rem; margin: 0; }
</style>
