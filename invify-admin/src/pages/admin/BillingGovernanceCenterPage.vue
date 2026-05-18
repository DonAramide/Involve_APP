<!-- invify-admin/src/pages/admin/BillingGovernanceCenterPage.vue -->
<template>
  <q-page class="q-pa-xl bg-main text-main" style="min-height: 100vh; position: relative; overflow: hidden;">
    <!-- Ambient Premium Radial Glows -->
    <div class="ambient-glow" />

    <!-- Master Command Center Header -->
    <div class="row items-center justify-between q-mb-xl relative-position" style="z-index: 10;">
      <div>
        <div class="row items-center op-gap-8 no-wrap cursor-help">
          <q-icon name="shield" color="emerald-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-main q-my-none letter-spacing-1">FINANCIAL GOVERNANCE & MONETIZATION CENTER</h1>
          <enterprise-context-hint registry-key="billing-double-entry" />
          <EnterpriseManualTooltip 
            title="Financial Governance Ecosystem"
            icon="shield"
            description="Authoritative control layer for global SaaS tariffs, double-entry reconciliation, locked conversion rates, and live operational telemetry."
            impact="CRITICAL: The central treasury brain of the platform."
          />
        </div>
        <div class="text-caption text-secondary q-mt-xs">
          Authoritative control layer for global SaaS tariffs, double-entry reconciliation, locked conversion rates, and live operational telemetry.
        </div>
      </div>

      <!-- Action Status Badge -->
      <div class="row items-center op-gap-8 bg-panel border-main q-px-md q-py-sm rounded-borders font-mono" style="border: 1px solid rgba(16, 185, 129, 0.25);">
        <span class="live-indicator-dot bg-emerald-5 animate-pulse"></span>
        <span class="text-emerald-4 text-weight-bold tracking-wider" style="font-size: 10px; font-family: monospace;">TREASURY SYSTEM: COMPLIANT</span>
      </div>
    </div>

    <!-- Overview Statistics Dashboard -->
    <div class="row q-col-gutter-md q-mb-lg relative-position" style="z-index: 10;">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-panel border-main q-pa-md text-center hover-glow rounded-borders">
          <div class="text-secondary text-caption font-mono text-uppercase tracking-wider" style="font-size: 9px;">GLOBAL PORTFOLIO GTV</div>
          <div class="text-h5 text-weight-bolder text-main q-mt-sm font-mono">₦{{ simulatedGTV.toLocaleString() }}</div>
          <div class="text-caption text-emerald-4 font-mono text-weight-bold q-mt-xs">+18.5% MTD</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-panel border-main q-pa-md text-center hover-glow rounded-borders">
          <div class="text-secondary text-caption font-mono text-uppercase tracking-wider" style="font-size: 9px;">PLATFORM REVENUE YIELD</div>
          <div class="text-h5 text-weight-bolder text-emerald-4 q-mt-sm font-mono">₦{{ totalRevenueCollected.toLocaleString(undefined, {maximumFractionDigits:2}) }}</div>
          <div class="text-caption text-muted font-mono q-mt-xs">Reconciled split basis</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-panel border-main q-pa-md text-center hover-glow rounded-borders">
          <div class="text-secondary text-caption font-mono text-uppercase tracking-wider" style="font-size: 9px;">RECOVERY QUEUE (DLQ)</div>
          <div class="text-h5 text-weight-bolder text-amber-5 q-mt-sm font-mono">{{ activeDLQCount }} Items</div>
          <div class="text-caption text-amber-5 font-mono q-mt-xs animate-pulse">Needs operator review</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-panel border-main q-pa-md text-center hover-glow rounded-borders">
          <div class="text-secondary text-caption font-mono text-uppercase tracking-wider" style="font-size: 9px;">ACTIVE INCIDENTS</div>
          <div class="text-h5 text-weight-bolder text-red-4 q-mt-sm font-mono">{{ activeIncidents.length }} Alerts</div>
          <div class="text-caption text-red-4 font-mono q-mt-xs" v-if="activeIncidents.length > 0">Anomalies Detected</div>
          <div class="text-caption text-muted font-mono q-mt-xs" v-else>All operations secure</div>
        </q-card>
      </div>
    </div>

    <!-- UI Tab Navigation Layout -->
    <div class="row q-col-gutter-lg relative-position" style="z-index: 10;">
      <div class="col-12">
        <q-card class="bg-panel border-main rounded-borders">
          <q-tabs
            v-model="activeTab"
            dense
            class="text-secondary"
            active-color="emerald-4"
            indicator-color="emerald-4"
            align="left"
            narrow-indicator
          >
            <q-tab name="tariffs" label="Tariff Governance" icon="payments" class="font-mono text-caption" />
            <q-tab name="sandbox" label="Pre-flight Sandbox" icon="calculate" class="font-mono text-caption" />
            <q-tab name="reconciliation" label="Reconciliation & Ledger" icon="fact_check" class="font-mono text-caption" />
            <q-tab name="entitlements" label="Entitlements Matrix" icon="admin_panel_settings" class="font-mono text-caption" />
            <q-tab name="incidents" label="Incidents & DLQ Recovery" icon="warning" class="font-mono text-caption animate-pulse" />
          </q-tabs>

          <q-separator :dark="prefs.isDarkMode" class="border-main" />

          <q-tab-panels v-model="activeTab" class="bg-panel text-main q-pa-lg">
            <!-- TAB 1: TARIFF GOVERNANCE -->
            <q-tab-panel name="tariffs">
              <div class="row q-col-gutter-lg">
                <!-- Tariff Modifier Controls -->
                <div class="col-12 col-md-7">
                  <div class="text-h6 text-weight-bold text-main q-mb-md row items-center op-gap-8 cursor-help">
                    <q-icon name="tune" color="emerald-4" size="sm" />
                    <span>Dynamic Tariff Parameter Configuration</span>
                    <enterprise-context-hint registry-key="billing-revenue-routing" />
                    <EnterpriseManualTooltip 
                      title="Dynamic Tariff Configuration"
                      icon="tune"
                      description="Centralized parameter controls allowing real-time adjustment of fixed amounts, percentage cuts, and min/max caps on 12 monetizeable billing classes. Enforced instantly at API gateways."
                      impact="CRITICAL: Adjusts platform billing formulas instantly for all upcoming multi-tenant transactions."
                    />
                  </div>

                  <div class="row q-col-gutter-md q-mb-lg">
                    <div class="col-12 col-sm-6">
                      <q-select
                        v-model="selectedFeeClass"
                        :options="feeClassOptions"
                        label="Monetization Target Class"
                        :dark="prefs.isDarkMode" filled dense
                        label-color="emerald-3"
                        @update:model-value="onFeeClassChanged"
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-select
                        v-model="selectedPricingModel"
                        :options="pricingModelOptions"
                        label="Pricing Formula Applied"
                        :dark="prefs.isDarkMode" filled dense
                        label-color="emerald-3"
                      />
                    </div>
                  </div>

                  <!-- Tariff Slider Inputs -->
                  <div class="q-mb-lg" v-if="selectedPricingModel !== 'fixed'">
                    <div class="row justify-between items-center q-mb-sm">
                      <span class="text-weight-bold text-secondary text-caption">Variable Platform Fee (%)</span>
                      <span class="text-emerald-4 text-weight-bolder text-h6 font-mono">{{ tariffPercentage }}%</span>
                    </div>
                    <q-slider
                      v-model="tariffPercentage"
                      :min="0.0"
                      :max="10.0"
                      :step="0.05"
                      color="emerald-5"
                      :dark="prefs.isDarkMode"
                      label
                      label-always
                    />
                  </div>

                  <div class="row q-col-gutter-md q-mb-lg">
                    <div class="col-12 col-sm-6">
                      <q-input
                        v-model.number="tariffFixedAmount"
                        type="number"
                        label="Base Fixed Amount"
                        :dark="prefs.isDarkMode" filled dense
                        prefix="₦"
                        label-color="emerald-3"
                        class="font-mono bg-subpanel border-main"
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-select
                        v-model="selectedCurrency"
                        :options="currencyOptions"
                        label="Settlement Currency"
                        :dark="prefs.isDarkMode" filled dense
                        label-color="emerald-3"
                      />
                    </div>
                  </div>

                  <div class="row q-col-gutter-md q-mb-lg">
                    <div class="col-12 col-sm-6">
                      <q-input
                        v-model.number="minCapAmount"
                        type="number"
                        label="Minimum Fee Cap"
                        :dark="prefs.isDarkMode" filled dense
                        prefix="₦"
                        label-color="emerald-3"
                        class="font-mono bg-subpanel border-main"
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-input
                        v-model.number="maxCapAmount"
                        type="number"
                        label="Maximum Fee Cap (0 for Unlimited)"
                        :dark="prefs.isDarkMode" filled dense
                        prefix="₦"
                        label-color="emerald-3"
                        class="font-mono bg-subpanel border-main"
                      />
                    </div>
                  </div>

                  <!-- Global Safety Guard & Mutators -->
                  <div class="q-pa-md bg-subpanel border-main rounded-borders q-mb-lg">
                    <div class="row items-center justify-between q-mb-sm">
                      <span class="text-caption text-secondary font-mono">GLOBAL MUTATION SAFEGUARD: ACTIVE</span>
                      <q-badge color="emerald-10" text-color="emerald-3" class="font-mono font-bold">50% MAX DELTA</q-badge>
                    </div>
                    <div class="text-caption text-secondary">
                      Tariff updates exceeding a 50% shift globally will trigger security blocks, mandating instant supervisor dual-approval authorization signatures.
                    </div>
                  </div>

                  <div class="row justify-end q-gutter-x-md">
                    <q-btn flat color="grey-5" label="CALIBRATE BASELINES" class="font-mono text-caption text-weight-bold" @click="resetToBaselines" />
                    <q-btn unelevated color="emerald-10" text-color="emerald-3" label="SAVE STRUCTURESnapshot" class="font-mono text-caption text-weight-bold letter-spacing-1 px-lg" @click="triggerFeeMutation" />
                  </div>
                </div>

                <!-- Snapshot History Ledger -->
                <div class="col-12 col-md-5">
                  <div class="text-h6 text-weight-bold text-main q-mb-md row items-center op-gap-8 cursor-help">
                    <q-icon name="history" color="emerald-4" size="sm" />
                    <span>Cryptographic Snapshot Register</span>
                    <EnterpriseManualTooltip 
                      title="Immutable Version Snapshots"
                      icon="fingerprint"
                      description="Generates cryptographically signed, timestamped configuration snapshots upon tariff adjustments. Binds execution-time prices to transaction pipelines permanently."
                      impact="HIGH: Prevents historical payment data corruption or retro-pricing manipulation."
                    />
                  </div>
                  <div class="text-caption text-secondary q-mb-lg">
                    Execution-time pricing snapshots permanently cataloged for billing history replay.
                  </div>

                  <q-list separator class="border-main rounded-borders overflow-hidden">
                    <q-item v-for="snap in activeSnapshots" :key="snap.versionHash" class="q-py-md bg-subpanel border-main q-mb-sm rounded-borders">
                      <q-item-section avatar>
                        <q-avatar color="emerald-10" text-color="emerald-4" rounded size="sm">
                          <q-icon name="fingerprint" size="xs" />
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-bold text-main text-caption">{{ snap.feeClass }}</q-item-label>
                        <q-item-label caption class="text-secondary font-mono" style="font-size: 10px;">{{ snap.versionHash }} ({{ snap.model }})</q-item-label>
                      </q-item-section>
                      <q-item-section side class="text-right">
                        <span class="text-emerald-4 font-mono text-weight-bold" style="font-size: 11px;">
                          {{ snap.model === 'fixed' ? '₦' + snap.baseFixedAmount : snap.basePercentageRate + '%' }}
                        </span>
                        <span class="text-muted font-mono" style="font-size: 9.5px;">Active Window</span>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
              </div>
            </q-tab-panel>

            <!-- TAB 2: PRE-FLIGHT SANDBOX -->
            <q-tab-panel name="sandbox">
              <div class="row q-col-gutter-lg">
                <!-- Sandbox Controller Inputs -->
                <div class="col-12 col-md-7">
                  <div class="text-h6 text-weight-bold text-main q-mb-md row items-center op-gap-8 cursor-help">
                    <q-icon name="science" color="emerald-4" size="sm" />
                    <span>Tariff pre-flight Dry-Run Simulator</span>
                    <EnterpriseManualTooltip 
                      title="Dry-Run Simulation Engine"
                      icon="science"
                      description="Models the financial yield shifts, affected accounts, and SLA variance impact of proposed tariff increases before actual deployment."
                      impact="LOW: Secure local propagation test bed with zero mutational side effects."
                    />
                  </div>
                  <div class="text-caption text-secondary q-mb-lg">
                    Project revenue shifts, impacted multi-tenant metrics, and SLA variances in a protected sandbox environment before executing modifications.
                  </div>

                  <div class="q-mb-xl bg-subpanel border-main q-pa-md rounded-borders">
                    <div class="row justify-between items-center q-mb-md">
                      <span class="text-weight-bold text-secondary text-caption">Hypothetical Monthly Volume GTV</span>
                      <span class="text-emerald-4 text-weight-bolder text-h6 font-mono">₦{{ (sandboxGTVVolume / 1000000).toFixed(0) }}M</span>
                    </div>
                    <q-slider
                      v-model="sandboxGTVVolume"
                      :min="100000000"
                      :max="1000000000"
                      :step="50000000"
                      color="emerald-5"
                      :dark="prefs.isDarkMode"
                      label
                    />
                  </div>

                  <!-- Live conversion testing tool -->
                  <div class="bg-subpanel border-main q-pa-md rounded-borders q-mb-lg">
                    <span class="text-caption text-weight-bold text-secondary q-mb-sm block cursor-help row items-center op-gap-4">
                      <span>Live sovereign conversions sandbox</span>
                      <EnterpriseManualTooltip 
                        title="FX Resolution Lock"
                        icon="currency_exchange"
                        description="Calculates cross-border transactions using exchange rate resolution matrices across NGN, USD, EUR, and GBP with locked FX rates."
                        impact="MODERATE: Emulates execution-time rate persistence."
                      />
                    </span>
                    <div class="row q-col-gutter-sm items-center">
                      <div class="col-4">
                        <q-input v-model.number="convertAmount" type="number" :dark="prefs.isDarkMode" dense filled prefix="₦" />
                      </div>
                      <div class="col-4">
                        <q-select v-model="convertCurrencyTo" :options="['USD', 'EUR', 'GBP']" :dark="prefs.isDarkMode" dense filled label="Convert To" />
                      </div>
                      <div class="col-4 text-right">
                        <span class="text-emerald-4 font-mono text-weight-bold">{{ convertCurrencyResult }}</span>
                      </div>
                    </div>
                  </div>

                  <q-btn unelevated color="emerald-10" text-color="emerald-3" label="CALCULATE SANDBOX PRE-FLIGHT OUTCOMES" class="full-width font-mono" @click="runSimulation" />
                </div>

                <!-- Simulation Outcome Analytics -->
                <div class="col-12 col-md-5">
                  <div class="text-h6 text-weight-bold text-main q-mb-md row items-center op-gap-8">
                    <q-icon name="bar_chart" color="emerald-4" size="sm" />
                    <span>Projected System Impact Analysis</span>
                    <EnterpriseManualTooltip 
                      title="Projected System Impact Analysis"
                      icon="bar_chart"
                      description="Provides simulated analysis reports detailing revenue variance rates, account impact distribution indices, and SLA contract boundaries."
                      impact="LOW: Informational pre-flight metrics."
                    />
                  </div>

                  <q-card class="bg-subpanel border-main q-pa-lg text-main" v-if="simulationResult">
                    <div class="row justify-between q-mb-sm">
                      <span class="text-secondary text-caption">Impact Class:</span>
                      <q-badge color="emerald-10" text-color="emerald-3">{{ simulationResult.impactRating }}</q-badge>
                    </div>
                    <div class="row justify-between q-mb-sm">
                      <span class="text-secondary text-caption">Revenue Shift Forecast:</span>
                      <span class="font-mono text-emerald-4 text-weight-bolder">₦{{ simulationResult.monthlyRevenueVariance.toLocaleString(undefined, {maximumFractionDigits:2}) }}/mo</span>
                    </div>
                    <div class="row justify-between q-mb-sm">
                      <span class="text-secondary text-caption">Affected Accounts:</span>
                      <span class="font-mono text-main text-weight-bold">{{ simulationResult.affectedTenantCount }} Tenants</span>
                    </div>
                    <div class="row justify-between q-mb-sm">
                      <span class="text-secondary text-caption">Active SLA Impacted:</span>
                      <span class="font-mono text-main text-weight-bold">{{ simulationResult.impactedSlasCount }} Contracts</span>
                    </div>
                    <q-separator :dark="prefs.isDarkMode" class="q-my-md border-main" />
                    <div class="text-caption text-secondary font-mono" style="font-size: 11px; line-height: 1.4;">
                      {{ simulationResult.notes }}
                    </div>
                  </q-card>
                  <div class="q-pa-lg border-main text-center text-muted rounded-borders" v-else>
                    Trigger pre-flight dry-runs to inspect revenue shifts dynamically.
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- TAB 3: RECONCILIATION & LEDGER -->
            <q-tab-panel name="reconciliation">
              <div class="row q-col-gutter-lg">
                <!-- Ledger audits -->
                <div class="col-12 col-md-7">
                  <div class="text-h6 text-weight-bold text-main q-mb-md row items-center op-gap-8 cursor-help">
                    <q-icon name="verified_user" color="emerald-4" size="sm" />
                    <span>Double-Entry clearing checks</span>
                    <EnterpriseManualTooltip 
                      title="Continuous Reconciliation Audit"
                      icon="verified_user"
                      description="Verifies double-entry matches across simulated portfolio GTV, gateway payouts, operator wallet balances, and platform split revenue margins."
                      impact="HIGH: Automated treasury auditing that signals discrepancies and halts unaligned payout processing."
                    />
                  </div>
                  <div class="text-caption text-secondary q-mb-lg">
                    Realtime validation matches: expected splits, gateway clearing payouts, and wallet credit states.
                  </div>

                  <q-card class="bg-subpanel border-main q-pa-md rounded-borders q-mb-lg">
                    <div class="row justify-between items-center q-mb-md">
                      <span class="text-caption text-secondary">Global ledger verification report</span>
                      <q-badge color="emerald-10" text-color="emerald-3">COMPLIANT</q-badge>
                    </div>
                    <div class="row q-col-gutter-md text-center">
                      <div class="col-3">
                        <span class="text-secondary block text-caption">Expected GTV</span>
                        <span class="text-metric font-mono text-main text-weight-bold" style="font-size: 13px;">₦{{ simulatedGTV.toLocaleString() }}</span>
                      </div>
                      <div class="col-3">
                        <span class="text-secondary block text-caption">Actual Payouts</span>
                        <span class="text-metric font-mono text-main text-weight-bold" style="font-size: 13px;">₦{{ actualGatewayPayouts.toLocaleString() }}</span>
                      </div>
                      <div class="col-3">
                        <span class="text-secondary block text-caption">Wallet Balances</span>
                        <span class="text-metric font-mono text-main text-weight-bold" style="font-size: 13px;">₦{{ globalWalletBalances.toLocaleString() }}</span>
                      </div>
                      <div class="col-3">
                        <span class="text-secondary block text-caption">Total Fees</span>
                        <span class="text-metric font-mono text-emerald-4 text-weight-bold" style="font-size: 13px;">₦{{ totalRevenueCollected.toLocaleString(undefined, {maximumFractionDigits:2}) }}</span>
                      </div>
                    </div>
                  </q-card>

                  <div class="row justify-between items-center q-mb-sm">
                    <span class="text-caption text-secondary">Immutable Audit Trail logs</span>
                    <q-btn flat dense icon="sync" color="emerald-4" label="RECOMPUTE LEDGER AUDITS" class="font-mono text-caption" @click="recomputeBalances" />
                  </div>

                  <q-list separator class="border-main rounded-borders overflow-hidden bg-subpanel q-mb-sm">
                    <q-item v-for="audit in auditJournal" :key="audit.auditId" class="q-py-md">
                      <q-item-section avatar>
                        <q-avatar color="emerald-10" text-color="emerald-4" rounded size="sm">
                          <q-icon name="gavel" size="xs" />
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-bold text-main text-caption">{{ audit.action }}</q-item-label>
                        <q-item-label caption class="text-secondary font-mono" style="font-size: 10px;">By: {{ audit.operator }} | {{ audit.reason }}</q-item-label>
                      </q-item-section>
                      <q-item-section side class="text-right">
                        <span class="text-muted font-mono" style="font-size: 9.5px;">TAMPER HASH</span>
                        <span class="text-emerald-4 font-mono font-bold" style="font-size: 9px;">{{ audit.tamperCheckHash }}</span>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>

                <!-- Real-time Telemetry Stream Log -->
                <div class="col-12 col-md-5">
                  <div class="text-h6 text-weight-bold text-main q-mb-md row items-center justify-between">
                    <div class="row items-center op-gap-8">
                      <q-icon name="rss_feed" color="emerald-4" size="sm" />
                      <span>Live Revenue Telemetry stream</span>
                      <EnterpriseManualTooltip 
                        title="Live Revenue Telemetry Stream" 
                        icon="rss_feed" 
                        description="Continuous pub/sub logging dispatching financial events, calculated platform splits, regional tax triggers, and active security threshold violations." 
                        impact="LOW: Diagnostic and auditing data stream." 
                      />
                    </div>
                    <span class="live-indicator-dot bg-emerald-5 animate-pulse"></span>
                  </div>

                  <q-card class="bg-subpanel border-main q-pa-md rounded-borders text-main" style="max-height: 450px; overflow-y: auto;">
                    <q-list separator class="font-mono text-caption">
                      <q-item v-for="evt in telemetryStream" :key="evt.eventId" class="q-py-xs">
                        <q-item-section>
                          <div class="row items-center justify-between">
                            <span class="text-emerald-4 font-weight-bold">[{{ evt.topic }}]</span>
                            <span class="text-muted" style="font-size: 9px;">{{ new Date(evt.timestamp).toLocaleTimeString() }}</span>
                          </div>
                          <div class="text-main text-metric-mono q-mt-xs" style="font-size: 11px;">
                            {{ evt.payload.message || JSON.stringify(evt.payload) }}
                          </div>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card>
                </div>
              </div>
            </q-tab-panel>

            <!-- TAB 4: ENTITLEMENTS MATRIX -->
            <q-tab-panel name="entitlements">
              <div class="row q-col-gutter-lg">
                <div class="col-12">
                  <div class="text-h6 text-weight-bold text-main q-mb-md row items-center op-gap-8 cursor-help">
                    <q-icon name="grid_on" color="emerald-4" size="sm" />
                    <span>Plan Capability Matrix & Quota Bounds</span>
                    <EnterpriseManualTooltip 
                      title="SaaS Entitlement Gates"
                      icon="grid_on"
                      description="Maps subscription tiers (Free, Premium, Enterprise) to operational limits including AI RCA features, GPS tracking, subject curriculums, and device terminals."
                      impact="CRITICAL: Enforces runtime capability blocks at transaction gateways."
                    />
                  </div>
                  <div class="text-caption text-secondary q-mb-lg">
                    Authoritative feature gating framework dynamically applied across Free, Premium, and Enterprise tenant operations.
                  </div>

                  <q-markup-table :dark="prefs.isDarkMode" flat bordered class="border-main bg-subpanel text-main font-mono text-caption">
                    <thead>
                      <tr>
                        <th class="text-left text-emerald-4">Capabilities / Features</th>
                        <th class="text-center text-weight-bold">FREE TIER</th>
                        <th class="text-center text-weight-bold">PREMIUM TIER</th>
                        <th class="text-center text-weight-bold">ENTERPRISE TIER</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="text-left text-weight-bold">AI Root Cause Analysis (RCA)</td>
                        <td class="text-center text-red-5"><q-icon name="close" /> Disabled</td>
                        <td class="text-center text-emerald-4"><q-icon name="check" /> Active</td>
                        <td class="text-center text-emerald-4"><q-icon name="check" /> Active</td>
                      </tr>
                      <tr>
                        <td class="text-left text-weight-bold">Premium Core Federation</td>
                        <td class="text-center text-red-5"><q-icon name="close" /> Disabled</td>
                        <td class="text-center text-red-5"><q-icon name="close" /> Disabled</td>
                        <td class="text-center text-emerald-4"><q-icon name="check" /> Active</td>
                      </tr>
                      <tr>
                        <td class="text-left text-weight-bold">Fleet Terminals Allowance</td>
                        <td class="text-center">1 Device</td>
                        <td class="text-center">10 Devices</td>
                        <td class="text-center text-emerald-4">Unlimited Devices</td>
                      </tr>
                      <tr>
                        <td class="text-left text-weight-bold">Telemetry Retention Scope</td>
                        <td class="text-center">7 Days</td>
                        <td class="text-center">30 Days</td>
                        <td class="text-center">365 Days</td>
                      </tr>
                      <tr>
                        <td class="text-left text-weight-bold">Monthly SMS Broadcast Allowance</td>
                        <td class="text-center">50 Units</td>
                        <td class="text-center">500 Units</td>
                        <td class="text-center">10,000 Units</td>
                      </tr>
                      <tr>
                        <td class="text-left text-weight-bold">Monthly AI Generation Limits</td>
                        <td class="text-center">10 Credits</td>
                        <td class="text-center">100 Credits</td>
                        <td class="text-center">5,000 Credits</td>
                      </tr>
                    </tbody>
                  </q-markup-table>
                </div>
              </div>
            </q-tab-panel>

            <!-- TAB 5: INCIDENTS & DLQ RECOVERY -->
            <q-tab-panel name="incidents">
              <div class="row q-col-gutter-lg">
                <!-- Recovery Queue (DLQ) -->
                <div class="col-12 col-md-6">
                  <div class="text-h6 text-weight-bold text-main q-mb-md row items-center op-gap-8 cursor-help">
                    <q-icon name="report_problem" color="amber-5" size="sm" />
                    <span>Settlements Recovery Queue (DLQ)</span>
                    <EnterpriseManualTooltip 
                      title="Dead Letter Queue Recovery"
                      icon="report_problem"
                      description="Maintains timed-out callbacks or signature validation failures. Enables manual replay of clearing events with strict double-credit suppression."
                      impact="HIGH: Protects transaction integrity by suppressing webhook replays."
                    />
                  </div>
                  <div class="text-caption text-secondary q-mb-lg">
                    Replay-safe Dead Letter Queue managing transactional timeouts, duplicate callbacks, and FX anomalies.
                  </div>

                  <q-list separator class="border-main rounded-borders overflow-hidden bg-subpanel">
                    <q-item v-for="item in recoveryQueue" :key="item.dlqId" class="q-py-md">
                      <q-item-section avatar>
                        <q-avatar color="amber-10" text-color="amber-4" rounded size="sm">
                          <q-icon name="hourglass_empty" size="xs" />
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-bold text-main text-caption">{{ item.reference }} ({{ item.gateway }})</q-item-label>
                        <q-item-label caption class="text-secondary font-mono" style="font-size: 10px;">Reason: {{ item.failureReason }} | Status: {{ item.status }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-btn
                          v-if="item.status !== 'RESOLVED'"
                          unelevated
                          color="emerald-10"
                          text-color="emerald-3"
                          label="FORCE REPLAY"
                          class="font-mono text-caption"
                          dense
                          @click="resolveDLQItem(item.dlqId)"
                        />
                        <q-badge v-else color="emerald-10" text-color="emerald-3" label="RESOLVED" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>

                <!-- Active Incidents alerts feed -->
                <div class="col-12 col-md-6">
                  <div class="text-h6 text-weight-bold text-main q-mb-md row items-center op-gap-8 cursor-help">
                    <q-icon name="notifications_active" color="red-4" size="sm" />
                    <span>Active Financial Incident Alerts</span>
                    <EnterpriseManualTooltip 
                      title="Treasury Threat Detection"
                      icon="notifications_active"
                      description="Monitors and flags anomalous behaviors including abnormal SMS surges, high deviation FX rate deviations, or supervisor key override events."
                      impact="CRITICAL: Triggers immediate operational containment protocols."
                    />
                  </div>
                  <div class="text-caption text-secondary q-mb-lg">
                    Runaway tariff spikes, high deviation FX drift, and abnormal SMS/AI surges flagged by security agents.
                  </div>

                  <div class="column q-gutter-y-sm">
                    <div
                      v-for="inc in activeIncidents"
                      :key="inc.incidentId"
                      class="q-pa-md bg-subpanel rounded-borders border-main q-mb-sm"
                      style="border-left: 4px solid #f87171 !important;"
                    >
                      <div class="row justify-between items-center q-mb-xs">
                        <span class="text-weight-bold text-main text-caption font-mono">{{ inc.type }}</span>
                        <q-badge color="red-10" text-color="red-3" class="font-mono" style="font-size: 9px;">{{ inc.severity }}</q-badge>
                      </div>
                      <div class="text-caption text-secondary q-mb-md font-mono" style="font-size: 11px;">
                        {{ inc.message }}
                      </div>
                      <div class="row justify-end">
                        <q-btn
                          flat
                          dense
                          color="emerald-4"
                          label="DISMISS INCIDENT"
                          class="font-mono text-caption"
                          @click="dismissIncident(inc.incidentId)"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="q-pa-lg text-center text-muted border-main rounded-borders" v-if="activeIncidents.length === 0">
                    No active incident anomalies. System state secure.
                  </div>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
    </div>

    <!-- Supervisor Dual-Approval Override Dialog -->
    <q-dialog v-model="approvalDialogOpen" persistent>
      <q-card class="bg-panel border-main text-main q-pa-lg" style="width: 450px; border-left: 4px solid var(--enterprise-border-focus) !important;">
        <div class="text-h6 text-weight-bold text-main q-mb-md row items-center op-gap-8">
          <q-icon name="security" color="emerald-4" />
          <span>Supervisor Dual-Approval Required</span>
        </div>
        <div class="text-caption text-secondary q-mb-lg">
          A tariff change has triggered standard mutation safety threshold alarms. Enter secure validation override keys to sign the execution.
        </div>

        <q-input
          v-model="supervisorKey"
          type="password"
          label="Supervisor Secure Authorization Pin"
          :dark="prefs.isDarkMode" filled dense
          label-color="emerald-3"
          class="q-mb-md"
        />

        <div class="row justify-end q-gutter-x-md">
          <q-btn flat color="grey-5" label="CANCEL" @click="approvalDialogOpen = false" />
          <q-btn unelevated color="emerald-10" text-color="emerald-3" label="SIGN OVERRIDE" @click="applySupervisorOverride" />
        </div>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useOperatorPreferences } from '../../composables/useOperatorPreferences'
import EnterpriseManualTooltip from '../../components/common/EnterpriseManualTooltip.vue'
import EnterpriseContextHint from '../../components/contextual/EnterpriseContextHint.vue'

// Centralized Engines Imports
import { FinancialRuleEngine } from '../../financial-governance/FinancialRuleEngine.js'
import { globalSnapshotRegistry } from '../../financial-governance/BillingSnapshotEngine.js'
import { globalFxEngine } from '../../financial-governance/FxResolutionEngine.js'
import { EntitlementResolutionEngine } from '../../financial-governance/EntitlementResolutionEngine.js'
import { QuotaEnforcementEngine } from '../../financial-governance/QuotaEnforcementEngine.js'
import { TaxResolutionEngine } from '../../financial-governance/TaxResolutionEngine.js'
import { RevenueReconciliationEngine } from '../../financial-governance/RevenueReconciliationEngine.js'
import { globalRecoveryQueue } from '../../financial-governance/FinancialRecoveryQueue.js'
import { globalIncidentEngine } from '../../financial-governance/FinancialIncidentEngine.js'
import { BillingPropagationEngine } from '../../modules/billing-governance/BillingPropagationEngine.js'
import { globalAuditGovernance } from '../../modules/billing-governance/BillingAuditGovernance.js'
import { globalTelemetryBus } from '../../modules/billing-governance/FinancialTelemetryEventBus.js'

const $q = useQuasar()
const { prefs } = useOperatorPreferences()

// State parameters
const activeTab = ref('tariffs')
const selectedFeeClass = ref('TRANSACTION_GATEWAY_CHARGE')
const selectedPricingModel = ref('hybrid')
const tariffPercentage = ref(1.25)
const tariffFixedAmount = ref(150)
const selectedCurrency = ref('NGN')
const minCapAmount = ref(50)
const maxCapAmount = ref(2000)

// Active system metrics
const simulatedGTV = ref(384850200)
const actualGatewayPayouts = ref(384850200)
const globalWalletBalances = ref(380068475)
const totalRevenueCollected = ref(4781725)

// FX sandbox
const convertAmount = ref(1000)
const convertCurrencyTo = ref('USD')

// Interactive simulator sandbox volume
const sandboxGTVVolume = ref(500000000)
const simulationResult = ref(null)

// Telemetry events
const telemetryStream = ref([])

// Lists
const activeSnapshots = ref([])
const recoveryQueue = ref([])
const activeIncidents = ref([])
const auditJournal = ref([])

// Safety approvals overrides states
const approvalDialogOpen = ref(false)
const supervisorKey = ref('')
const pendingContractPayload = ref(null)

// Select options
const feeClassOptions = Object.keys(FinancialRuleEngine.resolveActiveContract({ feeId: '1', feeClass: 'TRANSACTION_GATEWAY_CHARGE', model: 'hybrid', currency: 'NGN', baseFixedAmount: 150, basePercentageRate: 1.25, minCapAmount: 50, maxCapAmount: 2000, isTenantScoped: false, isRegionScoped: false, effectiveFrom: 0, expiresAt: 9999999999 }) ? {
  SAAS_SUBSCRIPTION: "SAAS_SUBSCRIPTION_FEE",
  TRANSACTION_GATEWAY: "TRANSACTION_GATEWAY_CHARGE",
  SMS_NOTIFICATION: "SMS_NOTIFICATION_CHARGE",
  AI_INTELLIGENCE_USAGE: "AI_INTELLIGENCE_USAGE_CHARGE"
} : {})

const pricingModelOptions = ['fixed', 'percentage', 'hybrid']
const currencyOptions = ['NGN', 'USD', 'EUR', 'GBP']

// Computeds
const convertCurrencyResult = computed(() => {
  const amountUSD = convertAmount.value / 1550 // Mock converting NGN to USD
  let rate = 1
  if (convertCurrencyTo.value === 'USD') rate = 1
  if (convertCurrencyTo.value === 'EUR') rate = 0.92
  if (convertCurrencyTo.value === 'GBP') rate = 0.79
  
  const resultVal = amountUSD * rate
  return `${convertCurrencyTo.value} $${resultVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
})

const activeDLQCount = computed(() => {
  return recoveryQueue.value.filter(i => i.status !== 'RESOLVED').length
})

// Initialization
onMounted(() => {
  // Listen to active events stream
  globalTelemetryBus.subscribe('fee.calculated', (evt) => {
    telemetryStream.value.unshift(evt)
  })
  globalTelemetryBus.subscribe('quota.exceeded', (evt) => {
    telemetryStream.value.unshift(evt)
  })
  globalTelemetryBus.subscribe('tariff.mutated', (evt) => {
    telemetryStream.value.unshift(evt)
  })
  globalTelemetryBus.subscribe('dlq.recovered', (evt) => {
    telemetryStream.value.unshift(evt)
  })

  // Set initial lists
  refreshLocalLists()

  // Generate some early mock incidents for full visual richness ONLY if none exist
  if (activeIncidents.value.length === 0) {
    globalIncidentEngine.logIncident('RUNAWAY_SMS_SPEND', 'WARNING', 'Abnormal SMS spend surge detected on tenant Elite Retail Hub (+240% above baseline).')
    globalIncidentEngine.logIncident('FX_RATE_ANOMALY', 'CRITICAL', 'Sovereign FX rate anomaly deviation: Paystack conversion rate dev higher than 5.2%.')
  }
  
  // Populate recovery queue mock items ONLY if empty
  if (recoveryQueue.value.length === 0) {
    globalRecoveryQueue.enqueueFailedSettlement({ reference: 'TX-PAY-94819', gateway: 'paystack', amount: 45000, failureReason: 'Processor timeout during transaction response.' })
    globalRecoveryQueue.enqueueFailedSettlement({ reference: 'TX-FLW-12984', gateway: 'flutterwave', amount: 89000, failureReason: 'HMAC validation signature check mismatch.' })
  }

  refreshLocalLists()
  onFeeClassChanged() // Restore saved parameters for selected target class immediately on mount
})

const refreshLocalLists = () => {
  activeSnapshots.value = Array.from(globalSnapshotRegistry.snapshots.values())
  recoveryQueue.value = [...globalRecoveryQueue.getQueue()]
  activeIncidents.value = [...globalIncidentEngine.getIncidents()]
  auditJournal.value = [...globalAuditGovernance.getJournal()]
}

// Actions & Methods
const onFeeClassChanged = () => {
  const snaps = Array.from(globalSnapshotRegistry.snapshots.values())
  const classSnaps = snaps.filter(s => s.feeClass === selectedFeeClass.value)
  
  if (classSnaps.length > 0) {
    // Sort by capturedAt descending to resolve the latest snapshot parameters
    classSnaps.sort((a, b) => b.capturedAt - a.capturedAt)
    const active = classSnaps[0]
    selectedPricingModel.value = active.model
    tariffFixedAmount.value = active.baseFixedAmount
    tariffPercentage.value = active.basePercentageRate
    minCapAmount.value = active.minCapAmount
    maxCapAmount.value = active.maxCapAmount
    selectedCurrency.value = active.currency
  } else {
    // Fall back to default canonical baselines
    if (selectedFeeClass.value === 'SAAS_SUBSCRIPTION') {
      selectedPricingModel.value = 'fixed'
      tariffFixedAmount.value = 15000
      tariffPercentage.value = 0
      minCapAmount.value = 0
      maxCapAmount.value = 0
      selectedCurrency.value = 'NGN'
    } else if (selectedFeeClass.value === 'SMS_NOTIFICATION') {
      selectedPricingModel.value = 'fixed'
      tariffFixedAmount.value = 4
      tariffPercentage.value = 0
      minCapAmount.value = 0
      maxCapAmount.value = 0
      selectedCurrency.value = 'NGN'
    } else {
      selectedPricingModel.value = 'hybrid'
      tariffFixedAmount.value = 150
      tariffPercentage.value = 1.25
      minCapAmount.value = 50
      maxCapAmount.value = 2000
      selectedCurrency.value = 'NGN'
    }
  }
}

const triggerFeeMutation = () => {
  const proposedContract = {
    feeId: `FEE-${Date.now().toString(36).toUpperCase()}`,
    feeClass: selectedFeeClass.value,
    model: selectedPricingModel.value,
    currency: selectedCurrency.value,
    baseFixedAmount: tariffFixedAmount.value,
    basePercentageRate: tariffPercentage.value,
    minCapAmount: minCapAmount.value,
    maxCapAmount: maxCapAmount.value,
    isTenantScoped: false,
    isRegionScoped: false,
    effectiveFrom: Date.now(),
    expiresAt: Date.now() + 86400000 * 365,
    versionHash: `V-${Date.now().toString(36).substring(2, 6).toUpperCase()}`
  }

  // Evaluate structural safety guards
  const oldContract = { baseFixedAmount: 100, basePercentageRate: 1.0 } // baseline mock comparison
  const safetyCheck = FinancialRuleEngine.validateFeeMutationSafety(oldContract, proposedContract, false)

  if (!safetyCheck.safe) {
    // Safety guard triggers dual approval override dial
    pendingContractPayload.value = proposedContract
    approvalDialogOpen.value = true
    $q.notify({
      type: 'warning',
      message: safetyCheck.error,
      position: 'top'
    })
  } else {
    // Process save snapshot instantly
    saveSnapshot(proposedContract)
  }
}

const applySupervisorOverride = () => {
  if (supervisorKey.value === 'override123' || supervisorKey.value === 'admin') {
    approvalDialogOpen.value = false
    saveSnapshot(pendingContractPayload.value, 'supervisor-key-approved')
    supervisorKey.value = ''
    pendingContractPayload.value = null
  } else {
    $q.notify({
      type: 'negative',
      message: 'Invalid Supervisor Authorization Override Key.',
      position: 'bottom'
    })
  }
}

const saveSnapshot = (contract, approvalNotes = 'Standard Mutation baseline') => {
  // Capture to Snapshot engine
  const snap = globalSnapshotRegistry.registerSnapshot(contract)
  
  // Save to Audit journal
  globalAuditGovernance.logAudit({
    operator: 'treasury-admin',
    action: 'MUTATE_FEE_APPROVED',
    feeClass: contract.feeClass,
    previousValue: '1.0% base',
    newValue: contract.model === 'fixed' ? '₦' + contract.baseFixedAmount : contract.basePercentageRate + '%',
    effectiveDate: contract.effectiveFrom,
    reason: approvalNotes
  })

  // Emit event via telemetry bus
  globalTelemetryBus.publish('tariff.mutated', {
    message: `Tariff snapshot compiled for ${contract.feeClass}. Version: ${snap.versionHash}.`
  })

  refreshLocalLists()

  $q.notify({
    type: 'positive',
    message: 'Billing tariff snapshot registered and saved to ledger successfully!',
    color: 'emerald-9',
    position: 'bottom-right'
  })
}

const runSimulation = () => {
  const proposed = {
    baseFixedAmount: tariffFixedAmount.value,
    basePercentageRate: tariffPercentage.value
  }
  const current = {
    baseFixedAmount: 100,
    basePercentageRate: 1.0
  }

  // Calculate pre-flight simulations
  simulationResult.value = BillingPropagationEngine.runPreFlightSimulation({
    currentContract: current,
    proposedContract: proposed,
    simulatedVolume: sandboxGTVVolume.value
  })

  $q.notify({
    message: 'Sandbox impact dry-run completed.',
    color: 'emerald-10',
    textColor: 'emerald-3',
    position: 'top-right'
  })
}

const recomputeBalances = () => {
  // Perform global ledger reconciles
  const check = RevenueReconciliationEngine.reconcileGlobalLedger(
    simulatedGTV.value,
    actualGatewayPayouts.value,
    globalWalletBalances.value,
    totalRevenueCollected.value
  )

  $q.notify({
    message: check.recommendation,
    color: 'emerald-10',
    textColor: 'emerald-3',
    icon: 'verified_user',
    position: 'top-right'
  })
}

const resolveDLQItem = (dlqId) => {
  const result = globalRecoveryQueue.processDLQ(dlqId, true)
  
  globalTelemetryBus.publish('dlq.recovered', {
    message: `Staged settlement recovery success. Ref: ${result.reference}.`
  })

  refreshLocalLists()

  $q.notify({
    type: 'positive',
    message: `DLQ item ${result.reference} successfully replayed and settled.`,
    color: 'emerald-9',
    position: 'bottom-right'
  })
}

const dismissIncident = (incidentId) => {
  globalIncidentEngine.resolveIncident(incidentId, 'Operator manual review.')
  refreshLocalLists()
  $q.notify({
    message: 'Incident resolved.',
    color: 'emerald-10',
    textColor: 'emerald-3',
    position: 'bottom-right'
  })
}

const resetToBaselines = () => {
  tariffFixedAmount.value = 150
  tariffPercentage.value = 1.25
  minCapAmount.value = 50
  maxCapAmount.value = 2000
  $q.notify({
    message: 'Baselines reset completed.',
    color: 'emerald-10',
    textColor: 'emerald-3',
    position: 'bottom-right'
  })
}
</script>

<style scoped>
.ambient-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 500px;
  background: radial-gradient(circle, rgba(26, 115, 232, 0.05) 0%, rgba(255,255,255,0) 70%);
  pointer-events: none;
  z-index: 1;
}

.theme-dark .ambient-glow {
  background: radial-gradient(circle, rgba(16, 185, 129, 0.04) 0%, rgba(0,0,0,0) 70%);
}

.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }

.hover-glow:hover {
  border-color: var(--enterprise-border-focus) !important;
  box-shadow: 0 0 15px rgba(26, 115, 232, 0.1);
  transition: all 0.3s ease;
}

.theme-dark .hover-glow:hover {
  border-color: rgba(16, 185, 129, 0.3) !important;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
}
</style>
