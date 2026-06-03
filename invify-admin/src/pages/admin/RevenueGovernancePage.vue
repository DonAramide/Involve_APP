<!-- invify-admin/src/pages/admin/RevenueGovernancePage.vue -->
<template>
  <q-page class="q-pa-xl text-white" style="background: #05070d; min-height: 100vh; position: relative; overflow: hidden;">
    <!-- Ambient Sleek Background Radials -->
    <div class="ambient-glow" />

    <!-- Page Header -->
    <div class="row items-center justify-between q-mb-xl relative-position" style="z-index: 10;">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="payments" color="teal-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">REVENUE GOVERNANCE</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Global platform billing orchestrator, variable commission margins, live merchant splits, and financial reconciliation.
        </div>
      </div>

      <!-- Action Status Badge -->
      <div class="row items-center op-gap-8 bg-panel border-teal q-px-md q-py-sm rounded-borders font-mono text-metric-sm" style="border: 1px solid rgba(20, 184, 166, 0.25);">
        <span class="live-indicator-dot bg-teal-5 animate-pulse"></span>
        <span class="text-teal-3 text-weight-bold tracking-wider" style="font-size: 10px;">REVENUE ENGINE: SECURE</span>
      </div>
    </div>

    <!-- Main Grid System -->
    <div class="row q-col-gutter-lg relative-position" style="z-index: 10;">
      
      <!-- Left Column: Variable Margin Control & Pricing Tiers -->
      <div class="col-12 col-md-7">
        <div class="column q-gutter-y-lg">
          
          <!-- Interactive Platform Margin Settings -->
          <q-card class="bg-card-dark border-grey-9 q-pa-lg">
            <div class="row items-center justify-between q-mb-md">
              <div class="text-h6 text-weight-bold text-white row items-center op-gap-8">
                <q-icon name="settings_suggest" color="teal-4" size="sm" />
                <span>Variable Commission Margin Controller</span>
              </div>
              <q-badge color="teal-10" text-color="teal-3" class="text-metric-sm font-mono text-weight-bold">
                SLDR_ACTIVE
              </q-badge>
            </div>
            <div class="text-caption text-grey-5 q-mb-xl">
              Modify the flat and variable splits automatically levied on checkout transactions, tuition collections, and logistics checkouts globally.
            </div>

            <!-- Commission Slider -->
            <div class="q-mb-xl">
              <div class="row justify-between items-center q-mb-sm">
                <span class="text-weight-bold text-grey-4 text-caption">Variable Platform Fee (%)</span>
                <span class="text-metric-mono text-teal-4 text-weight-bolder text-h6 font-mono">{{ platformFeePercentage }}%</span>
              </div>
              <q-slider
                v-model="platformFeePercentage"
                :min="0.25"
                :max="5.0"
                :step="0.05"
                color="teal-5"
                dark
                label
                label-always
              />
              <div class="row justify-between text-grey-6 font-mono text-caption q-mt-xs" style="font-size: 10px;">
                <span>Min limit: 0.25%</span>
                <span>Max limit: 5.0%</span>
              </div>
            </div>

            <div class="row q-col-gutter-md q-mb-lg">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="flatProcessingFee"
                  type="number"
                  label="Flat Processing Fee (₦)"
                  dark filled dense
                  :prefix="currentCurrency.symbol"
                  label-color="teal-3"
                  class="font-mono bg-black-transparent"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="smsChargeTier"
                  type="number"
                  label="SMS/Telemetry Unit Cost (₦)"
                  dark filled dense
                  :prefix="currentCurrency.symbol"
                  label-color="teal-3"
                  class="font-mono bg-black-transparent"
                />
              </div>
            </div>

            <q-separator dark class="q-my-md opacity-10" />

            <div class="row justify-end q-gutter-x-md">
              <q-btn flat color="grey-5" label="RESET DEFAULTS" class="font-mono text-caption text-weight-bold" @click="resetDefaults" />
              <q-btn unelevated color="teal-10" text-color="teal-3" label="SAVE TARIFF PARAMETERS" class="font-mono text-caption text-weight-bold letter-spacing-1 px-lg" @click="saveTariff" />
            </div>
          </q-card>

          <!-- Dynamic Live Revenue Simulator -->
          <q-card class="bg-card-dark border-grey-9 q-pa-lg">
            <div class="text-h6 text-weight-bold text-white q-mb-md row items-center op-gap-8">
              <q-icon name="calculate" color="teal-4" size="sm" />
              <span>Realtime Settlement Yield Simulator</span>
            </div>
            <div class="text-caption text-grey-5 q-mb-lg">
              Input hypothetical checkout values to view direct merchant payouts, tax withholdings, and real-time governance revenue cuts instantly.
            </div>

            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="simulatorVolume"
                  type="number"
                  label="Hypothetical Transaction Size"
                  dark filled dense
                  :prefix="currentCurrency.symbol"
                  label-color="teal-3"
                  class="font-mono bg-black-transparent"
                />
              </div>
              <div class="col-12 col-sm-6">
                <div class="bg-black-transparent border-grey-9 q-pa-md rounded-borders">
                  <div class="row justify-between q-mb-xs">
                    <span class="text-grey-5 text-caption">Platform Share:</span>
                    <span class="text-weight-bold text-teal-4 font-mono">{{ currentCurrency.symbol }}{{ platformShare.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}</span>
                  </div>
                  <div class="row justify-between">
                    <span class="text-grey-5 text-caption">Merchant Net:</span>
                    <span class="text-weight-bold text-white font-mono">{{ currentCurrency.symbol }}{{ merchantNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </q-card>

        </div>
      </div>

      <!-- Right Column: Interactive Realtime Metrics & Settlement Audit -->
      <div class="col-12 col-md-5">
        <div class="column q-gutter-y-lg">
          
          <!-- Key Metrics -->
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-card class="bg-card-dark border-grey-9 q-pa-md text-center">
                <div class="text-grey-5 text-caption font-mono text-uppercase tracking-wider" style="font-size: 9px; letter-spacing: 1px;">TOTAL GTV</div>
                <div class="text-h5 text-weight-bolder text-white q-mt-sm font-mono">{{ currentCurrency.symbol }}{{ simulatedGTV.toLocaleString() }}</div>
                <div class="text-caption text-teal-4 font-mono text-weight-bold q-mt-xs">+18.5% MTD</div>
              </q-card>
            </div>
            <div class="col-6">
              <q-card class="bg-card-dark border-grey-9 q-pa-md text-center">
                <div class="text-grey-5 text-caption font-mono text-uppercase tracking-wider" style="font-size: 9px; letter-spacing: 1px;">PLATFORM REVENUE</div>
                <div class="text-h5 text-weight-bolder text-teal-4 q-mt-sm font-mono">{{ currentCurrency.symbol }}{{ simulatedRev.toLocaleString() }}</div>
                <div class="text-caption text-grey-6 font-mono q-mt-xs">Target Met</div>
              </q-card>
            </div>
          </div>

          <!-- Live Merchant Revenue Split logs -->
          <q-card class="bg-card-dark border-grey-9 q-pa-lg">
            <div class="row items-center justify-between q-mb-md">
              <div class="text-h6 text-weight-bold text-white row items-center op-gap-8">
                <q-icon name="list_alt" color="teal-4" size="sm" />
                <span>Settlement Split Stream Logs</span>
              </div>
              <q-btn flat dense round icon="refresh" color="teal-4" @click="refreshSettlements" />
            </div>
            <div class="text-caption text-grey-5 q-mb-lg">
              Dynamic transactional revenue logs routed through isolated smart treasury routes.
            </div>

            <q-list separator class="border-grey-9 rounded-borders overflow-hidden">
              <q-item v-for="log in settlementLogs" :key="log.id" class="q-py-md bg-black-transparent">
                <q-item-section avatar>
                  <q-avatar color="teal-10" text-color="teal-4" rounded size="sm">
                    <q-icon :name="log.icon" size="xs" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold text-white text-caption">{{ log.tenant }}</q-item-label>
                  <q-item-label caption class="text-grey-5 font-mono" style="font-size: 10px;">{{ log.date }}</q-item-label>
                </q-item-section>
                <q-item-section side class="text-right">
                  <span class="text-metric-mono font-mono text-teal-4 text-weight-bold" style="font-size: 11px;">+{{ currentCurrency.symbol }}{{ log.feeCollected.toLocaleString() }}</span>
                  <span class="text-grey-6 font-mono" style="font-size: 9.5px;">GTV: {{ currentCurrency.symbol }}{{ log.volume.toLocaleString() }}</span>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>

        </div>
      </div>

    </div>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// State
const platformFeePercentage = ref(1.25)
const flatProcessingFee = ref(150)
const smsChargeTier = ref(4)
const simulatorVolume = ref(50000)

const simulatedGTV = ref(384850200)
const simulatedRev = ref(18485020)

const platformShare = computed(() => {
  return (simulatorVolume.value * (platformFeePercentage.value / 100)) + flatProcessingFee.value
})

const merchantNet = computed(() => {
  return Math.max(0, simulatorVolume.value - platformShare.value)
})

// Mock Settlements Data
const settlementLogs = ref([
  { id: 1, tenant: 'Glisten International Academy', icon: 'school', date: 'Just Now', volume: 150000, feeCollected: 2025 },
  { id: 2, tenant: 'Abuja Retail Supermart Ltd', icon: 'shopping_cart', date: '3 mins ago', volume: 45000, feeCollected: 712.5 },
  { id: 3, tenant: 'Elite Tailors & Drycleaners', icon: 'dry_cleaning', date: '12 mins ago', volume: 85000, feeCollected: 1212.5 },
  { id: 4, tenant: 'Federal Capital Fleet Express', icon: 'explore', date: '25 mins ago', volume: 220000, feeCollected: 2900 }
])

const resetDefaults = () => {
  platformFeePercentage.value = 1.25
  flatProcessingFee.value = 150
  smsChargeTier.value = 4
  $q.notify({
    type: 'info',
    message: 'Tariffs set to default system indices.',
    color: 'teal-10',
    textColor: 'teal-3',
    position: 'bottom-right'
  })
}

const saveTariff = () => {
  $q.notify({
    type: 'positive',
    message: 'Tariffs saved to persistent lookup array successfully!',
    color: 'teal-9',
    position: 'bottom-right'
  })
}

const refreshSettlements = () => {
  const tenants = [
    { name: 'Kano Tech High School', icon: 'school' },
    { name: 'Lagos Hub Retail Outlet', icon: 'shopping_cart' },
    { name: 'Classic Tailors & Co.', icon: 'dry_cleaning' },
    { name: 'Port Harcourt Cargo Depot', icon: 'explore' }
  ]
  const randomTenant = tenants[Math.floor(Math.random() * tenants.length)]
  const volume = Math.floor(Math.random() * 200000) + 10000
  const fee = (volume * (platformFeePercentage.value / 100)) + flatProcessingFee.value

  settlementLogs.value.unshift({
    id: Date.now(),
    tenant: randomTenant.name,
    icon: randomTenant.icon,
    date: 'Just Now',
    volume,
    feeCollected: parseFloat(fee.toFixed(1))
  })

  if (settlementLogs.value.length > 5) {
    settlementLogs.value.pop()
  }

  simulatedGTV.value += volume
  simulatedRev.value += fee

  $q.notify({
    message: 'New payment settlement parsed and logged.',
    color: 'teal-10',
    textColor: 'teal-3',
    icon: 'payments',
    position: 'top-right',
    timeout: 1500
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
  background: radial-gradient(circle, rgba(20, 184, 166, 0.04) 0%, rgba(5,7,13,0) 70%);
  pointer-events: none;
  z-index: 1;
}

.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }
.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }

.bg-panel {
  background: #0b0f19;
}

.bg-black-transparent {
  background: rgba(0, 0, 0, 0.2);
}
</style>
