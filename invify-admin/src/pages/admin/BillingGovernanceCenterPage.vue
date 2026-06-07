<!-- invify-admin/src/pages/admin/BillingGovernanceCenterPage.vue -->
<template>
  <q-page class="q-pa-xl text-white" style="background: #05070d; min-height: 100vh; position: relative; overflow: hidden;">
    <div class="ambient-glow" />

    <!-- Master Governance Header -->
    <div class="row items-center justify-between q-mb-xl relative-position" style="z-index: 10;">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="account_balance" color="indigo-4" size="lg" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Enterprise Billing Governance</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs font-mono">
          Global monetization authority • Centralized fee orchestration • Immutable financial lineage
        </div>
      </div>

      <!-- Live Engine Status -->
      <div class="row items-center op-gap-8 bg-panel border-indigo q-px-md q-py-sm rounded-borders font-mono text-metric-sm" style="border: 1px solid rgba(99, 102, 241, 0.25);">
        <span class="live-indicator-dot bg-indigo-5 animate-pulse"></span>
        <span class="text-indigo-3 text-weight-bold tracking-wider" style="font-size: 10px;">FINANCIAL RULE ENGINE: ACTIVE</span>
      </div>
    </div>

    <!-- Governance Dashboards Grid -->
    <div class="row q-col-gutter-lg relative-position" style="z-index: 10;">

      <!-- Left Column: Dynamic Fee Config & Subscriptions -->
      <div class="col-12 col-md-7">
        
        <!-- Subscription Plan Governance -->
        <q-card class="bg-card-dark border-grey-9 q-pa-lg q-mb-lg shadow-24">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-h6 text-weight-bold text-white row items-center op-gap-8">
              <q-icon name="card_membership" color="indigo-4" size="sm" />
              <span>Subscription Plan Governance</span>
            </div>
            <q-btn flat dense icon="sync" color="indigo-4" @click="syncPlans" />
          </div>
          
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-4" v-for="plan in subscriptionPlans" :key="plan.tier">
              <div class="bg-black-transparent border-grey-9 q-pa-md rounded-borders column full-height">
                <div class="row justify-between items-center q-mb-sm">
                  <span class="text-weight-bold text-white text-caption">{{ plan.tier }}</span>
                  <q-badge :color="plan.isActive ? 'green-10' : 'grey-9'" :text-color="plan.isActive ? 'green-4' : 'grey-6'">
                    {{ plan.isActive ? 'LIVE' : 'DRAFT' }}
                  </q-badge>
                </div>
                <div class="text-h5 text-weight-bolder text-indigo-3 font-mono q-mb-md">
                  {{ currentCurrency.symbol }}{{ plan.monthlyCost.toLocaleString() }}<span class="text-caption text-grey-6">/mo</span>
                </div>
                
                <div class="column q-gutter-y-xs q-mb-md text-caption text-grey-5 font-mono" style="font-size: 10px;">
                  <div class="row justify-between">
                    <span>Max Terminals:</span><span class="text-white">{{ plan.maxTerminals }}</span>
                  </div>
                  <div class="row justify-between">
                    <span>AI Tokens:</span><span class="text-white">{{ plan.aiTokens.toLocaleString() }}</span>
                  </div>
                  <div class="row justify-between">
                    <span>SLA Class:</span><span :class="plan.prioritySla ? 'text-amber-4' : 'text-white'">{{ plan.prioritySla ? 'Priority' : 'Standard' }}</span>
                  </div>
                </div>
                
                <q-space />
                <q-btn outline dense color="indigo-5" class="full-width font-mono" style="font-size: 10px;" label="CONFIGURE LIMITS" @click="configureLimits(plan)" />
              </div>
            </div>
          </div>
        </q-card>

        <!-- Dynamic Fee Orchestration -->
        <q-card class="bg-card-dark border-grey-9 q-pa-lg shadow-24">
          <div class="text-h6 text-weight-bold text-white row items-center op-gap-8 q-mb-xs">
            <q-icon name="request_quote" color="indigo-4" size="sm" />
            <span>Dynamic Fee Orchestration (Global)</span>
          </div>
          <div class="text-caption text-grey-5 q-mb-md">
            Modify canonical transaction tariffs. These values propagate instantaneously to all edge POS clients.
          </div>

          <div class="bg-black-transparent border-grey-9 rounded-borders overflow-hidden">
            <q-list separator>
              <q-item v-for="fee in masterFees" :key="fee.id" class="q-py-md">
                <q-item-section>
                  <q-item-label class="text-weight-bold text-white">{{ fee.name }}</q-item-label>
                  <q-item-label caption class="text-grey-5 font-mono" style="font-size: 10px;">Category: {{ fee.category }}</q-item-label>
                </q-item-section>
                
                <q-item-section>
                  <q-input
                    v-model.number="fee.flatAmount"
                    type="number"
                    dark dense filled
                    :prefix="currentCurrency.symbol"
                    class="font-mono bg-panel text-caption"
                    :disable="fee.type === 'PERCENTAGE'"
                  />
                </q-item-section>
                <q-item-section>
                  <q-input
                    v-model.number="fee.percentageAmount"
                    type="number"
                    dark dense filled
                    suffix="%"
                    class="font-mono bg-panel text-caption"
                    :disable="fee.type === 'FLAT'"
                  />
                </q-item-section>
                
                <q-item-section side>
                  <q-btn unelevated color="indigo-10" text-color="indigo-3" icon="publish" dense round size="sm" @click="propagateFee(fee)" />
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card>

      </div>

      <!-- Right Column: Audit Timeline & Revenue Intel -->
      <div class="col-12 col-md-5">
        <div class="column q-gutter-y-lg">
          
          <!-- Revenue Intelligence -->
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-card class="bg-card-dark border-grey-9 q-pa-md text-center shadow-24">
                <div class="text-grey-5 text-caption font-mono text-uppercase tracking-wider" style="font-size: 9px; letter-spacing: 1px;">PLATFORM MRR EST.</div>
                <div class="text-h5 text-weight-bolder text-white q-mt-sm font-mono">{{ currentCurrency.symbol }}{{ mrrEstimate.toLocaleString() }}</div>
                <div class="text-caption text-green-4 font-mono text-weight-bold q-mt-xs">↑ 12.4% vs Last Month</div>
              </q-card>
            </div>
            <div class="col-6">
              <q-card class="bg-card-dark border-grey-9 q-pa-md text-center shadow-24">
                <div class="text-grey-5 text-caption font-mono text-uppercase tracking-wider" style="font-size: 9px; letter-spacing: 1px;">FEE YIELD MTD</div>
                <div class="text-h5 text-weight-bolder text-indigo-4 q-mt-sm font-mono">{{ currentCurrency.symbol }}{{ feeYield.toLocaleString() }}</div>
                <div class="text-caption text-grey-6 font-mono q-mt-xs">Aggregated POS Volume</div>
              </q-card>
            </div>
          </div>

          <!-- Financial Audit & Versioning Timeline -->
          <q-card class="bg-card-dark border-grey-9 q-pa-lg shadow-24">
            <div class="row items-center justify-between q-mb-md">
              <div class="text-h6 text-weight-bold text-white row items-center op-gap-8">
                <q-icon name="history_edu" color="indigo-4" size="sm" />
                <span>Financial Audit Lineage</span>
              </div>
              <q-badge color="blue-grey-9" text-color="grey-4" class="font-mono">IMMUTABLE LEDGER</q-badge>
            </div>
            
            <q-timeline color="indigo-5" dark class="q-mt-md">
              <q-timeline-entry
                v-for="audit in auditLogs"
                :key="audit.id"
                :title="`v${audit.newVersion} — ${audit.action}`"
                :subtitle="audit.timestamp"
                :icon="audit.action === 'ROLLBACK' ? 'undo' : 'edit'"
                :color="audit.action === 'ROLLBACK' ? 'red-5' : 'indigo-4'"
              >
                <div class="text-caption text-grey-4">
                  <span class="font-mono text-indigo-2">{{ audit.feeConfigId }}</span> updated by <strong>{{ audit.operatorId }}</strong>
                </div>
                <div class="text-caption text-grey-6 q-mt-xs italic font-mono" style="font-size: 9px;">
                  Reason: {{ audit.reason }}
                </div>
                
                <div class="q-mt-sm row op-gap-8" v-if="audit.action !== 'ROLLBACK'">
                   <q-btn outline dense color="red-10" text-color="red-3" class="font-mono text-weight-bold letter-spacing-1" style="font-size: 9px;" label="EMERGENCY ROLLBACK" @click="rollbackFee(audit)" />
                </div>
              </q-timeline-entry>
            </q-timeline>
          </q-card>

        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// Intel
const mrrEstimate = ref(45802000)
const feeYield = ref(8420500)

// Configs
const subscriptionPlans = ref([
  { tier: 'FREE', monthlyCost: 0, maxTerminals: 1, aiTokens: 100, prioritySla: false, isActive: true },
  { tier: 'BASIC', monthlyCost: 15000, maxTerminals: 3, aiTokens: 5000, prioritySla: false, isActive: true },
  { tier: 'ENTERPRISE', monthlyCost: 120000, maxTerminals: 99, aiTokens: 500000, prioritySla: true, isActive: true }
])

const masterFees = ref([
  { id: 'tx_pos_base', name: 'POS Checkout Fee', category: 'TRANSACTION', type: 'HYBRID', flatAmount: 50, percentageAmount: 1.25 },
  { id: 'tx_wallet_withdrawal', name: 'Treasury Withdrawal', category: 'WITHDRAWAL', type: 'FLAT', flatAmount: 250, percentageAmount: 0 },
  { id: 'sms_telemetry', name: 'SMS Broadcast Node', category: 'SMS', type: 'FLAT', flatAmount: 4, percentageAmount: 0 },
  { id: 'ai_inference', name: 'AI Generation Task', category: 'AI_INTELLIGENCE', type: 'FLAT', flatAmount: 10, percentageAmount: 0 }
])

const auditLogs = ref([
  { id: 1, timestamp: '12 mins ago', newVersion: 4, action: 'UPDATE', feeConfigId: 'tx_pos_base', operatorId: 'sys_admin_root', reason: 'Adjusted base commission for new merchant cohort' },
  { id: 2, timestamp: '2 days ago', newVersion: 3, action: 'ROLLBACK', feeConfigId: 'tx_wallet_withdrawal', operatorId: 'sys_admin_root', reason: 'Reverting withdrawal hike due to merchant complaints' },
  { id: 3, timestamp: '1 week ago', newVersion: 2, action: 'UPDATE', feeConfigId: 'sms_telemetry', operatorId: 'auto_sys', reason: 'Carrier upstream cost adjusted' }
])

// Actions
const syncPlans = () => {
  $q.notify({ type: 'info', message: 'Synchronizing subscription configurations with Quasar...', color: 'indigo-10', textColor: 'indigo-3' })
}

const propagateFee = (fee) => {
  $q.notify({
    type: 'positive',
    message: `[Financial Propagation Engine] Broadcasted ${fee.id} update to 1,420 Fleet nodes.`,
    color: 'indigo-10',
    textColor: 'indigo-2',
    icon: 'wifi_tethering',
    position: 'top-right'
  })
  
  auditLogs.value.unshift({
    id: Date.now(),
    timestamp: 'Just Now',
    newVersion: 5,
    action: 'UPDATE',
    feeConfigId: fee.id,
    operatorId: 'sys_admin_root',
    reason: 'Manual console override'
  })
}

const rollbackFee = (audit) => {
  $q.dialog({
    title: 'Confirm Financial Rollback',
    message: `Are you sure you want to rollback ${audit.feeConfigId} to version ${audit.newVersion - 1}? This is a permanent audit mutation.`,
    color: 'red',
    ok: 'ROLLBACK',
    cancel: true,
    dark: true
  }).onOk(() => {
    $q.notify({ type: 'warning', message: 'Rollback enforced. Financial state reverted safely.' })
    auditLogs.value.unshift({
      id: Date.now(),
      timestamp: 'Just Now',
      newVersion: audit.newVersion - 1,
      action: 'ROLLBACK',
      feeConfigId: audit.feeConfigId,
      operatorId: 'sys_admin_root',
      reason: 'Emergency supervisor rollback'
    })
  })
}

const configureLimits = (plan) => {
  $q.dialog({
    title: `Configure Limits - ${plan.tier}`,
    message: 'Live configuration of plan limits is currently under development. These values are simulated mock data.',
    color: 'indigo-8',
    ok: 'Understood',
    dark: true
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
  background: radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, rgba(5,7,13,0) 70%);
  pointer-events: none;
  z-index: 1;
}

.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }
.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }

.bg-panel { background: #0b0f19; }
.bg-black-transparent { background: rgba(0, 0, 0, 0.2); }
</style>
