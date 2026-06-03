<!-- invify-admin/src/pages/tenant/TenantIndustryPOSPage.vue -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <!-- Ambient Stripe Glow -->
    <div class="ambient-glow" :style="`background: radial-gradient(circle, rgba(${activeManifest.glowRgb}, 0.06) 0%, rgba(5,7,13,0) 70%);`" />

    <!-- Page Header -->
    <div class="row items-center justify-between q-mb-xl relative-position" style="z-index: 10;">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="point_of_sale" :color="activeManifest.color + '-4'" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Cashier Checkout Desk</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Provision payment intents, trigger webhook signatures, and execute merchant payouts.
        </div>
      </div>

      <!-- WS Connection Badge -->
      <div class="row items-center op-gap-8 bg-black-transparent border-grey-9 q-px-md q-py-sm rounded-borders font-mono text-metric-sm">
        <span class="live-indicator-dot bg-green-5 animate-pulse"></span>
        <span class="text-grey-4 text-weight-bold">QUASAR CORE ACTIVE</span>
      </div>
    </div>

    <!-- Main Layout Grid -->
    <div class="row q-col-gutter-lg relative-position" style="z-index: 10;">
      
      <!-- Left Column: Checkout Catalog Selection -->
      <div class="col-12 col-md-7">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit column justify-between">
          <div>
            <div class="row items-center justify-between q-mb-md">
              <span class="text-h6 text-weight-bold text-white">Catalog Items</span>
              <q-badge color="indigo-10" text-color="indigo-3" class="text-weight-bold font-mono">{{ activeIndustry.toUpperCase() }} SPECIFIC</q-badge>
            </div>

            <!-- Grid catalog of items -->
            <div class="row q-col-gutter-md q-mb-lg">
              <div class="col-6 col-sm-4" v-for="item in activeManifest.items" :key="item.name">
                <q-card clickable @click="addToCart(item)" class="item-card border-grey-9 q-pa-md transition-3 text-center cursor-pointer">
                  <q-icon :name="item.icon" :color="activeManifest.color + '-4'" size="md" class="q-mb-sm" />
                  <div class="text-caption text-weight-bold text-white ellipsis">{{ item.name }}</div>
                  <div class="text-metric-mono font-mono text-grey-5 q-mt-xs">{{ currentCurrency.symbol }}{{ item.price.toLocaleString() }}</div>
                </q-card>
              </div>
            </div>
          </div>

          <!-- Checkout Cart summary -->
          <div class="border-top border-grey-9 q-pt-md">
            <div class="text-caption text-operator-title text-grey-5 q-mb-sm">ACTIVE CART</div>
            
            <div v-if="cart.length === 0" class="q-py-md text-center text-grey-6 text-caption italic">
              Cart is currently empty. Click catalog items above to add.
            </div>
            
            <q-list v-else dense separator class="border-grey-9 rounded-borders q-mb-md">
              <q-item v-for="(cartItem, idx) in cart" :key="idx" class="q-py-sm">
                <q-item-section>
                  <q-item-label class="text-weight-bold text-white text-caption">{{ cartItem.name }}</q-item-label>
                  <q-item-label caption class="text-grey-5 font-mono">1 x {{ currentCurrency.symbol }}{{ cartItem.price.toLocaleString() }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row items-center op-gap-8">
                    <span class="text-white font-mono text-caption text-weight-bold">{{ currentCurrency.symbol }}{{ cartItem.price.toLocaleString() }}</span>
                    <q-btn flat round dense color="red-4" icon="delete" size="xs" @click="removeFromCart(idx)" />
                  </div>
                </q-item-section>
              </q-item>
            </q-list>

            <q-separator dark class="q-my-md opacity-10" />

            <!-- Price Breakdown -->
            <div class="column q-gap-6 text-caption text-grey-5 font-mono q-mb-md">
              <div class="row justify-between">
                <span>Subtotal</span>
                <span class="text-white">{{ currentCurrency.symbol }}{{ subtotal.toLocaleString() }}</span>
              </div>
              <div class="row justify-between">
                <span>Gateway Processor Fee ({{ activeProcessor.fee * 100 }}%)</span>
                <span class="text-white">{{ currentCurrency.symbol }}{{ processingFee.toLocaleString() }}</span>
              </div>
              <q-separator dark class="opacity-5 q-my-xs" />
              <div class="row justify-between text-weight-bold">
                <span class="text-white">Total Ledger Balance</span>
                <span :class="`text-${activeManifest.color}-4`" style="font-size: 15px;">{{ currentCurrency.symbol }}{{ grandTotal.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Right Column: Quasar Payment Intent Sandbox -->
      <div class="col-12 col-md-5">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit column justify-between">
          <div>
            <div class="text-h6 text-weight-bold text-white q-mb-xs">Payment Execution Intent</div>
            <div class="text-caption text-grey-5 q-mb-lg">Select payment gateway path and provide customer billing data.</div>

            <!-- Customer inputs -->
            <div class="column q-gutter-y-md q-mb-lg">
              <q-input dark filled v-model="customer.email" label="Customer Email" color="indigo-4" type="email" dense class="bg-black-transparent rounded-borders" />
              <q-input dark filled v-model="customer.phone" label="Customer Phone Number (OTP Target)" color="indigo-4" mask="+### #########" dense class="bg-black-transparent rounded-borders" />
              
              <!-- Payment Processor Selector -->
              <div>
                <div class="text-operator-title text-grey-5 q-mb-sm" style="font-size: 9.5px; letter-spacing: 1px;">CHOOSE DISBURSEMENT PROCESSOR</div>
                <div class="row q-col-gutter-sm">
                  <div class="col-4" v-for="proc in PROCESSORS" :key="proc.name">
                    <q-card 
                      clickable 
                      @click="activeProcessor = proc" 
                      :class="activeProcessor.name === proc.name ? 'border-active bg-indigo-10 text-indigo-3' : 'border-grey-9'"
                      class="q-pa-sm text-center cursor-pointer transition-2 rounded-borders hover-bg"
                    >
                      <q-icon :name="proc.icon" size="sm" :color="activeProcessor.name === proc.name ? 'indigo-4' : 'grey-5'" />
                      <div class="text-metric-mono font-mono text-weight-bold q-mt-xs text-white" style="font-size: 10px;">{{ proc.name }}</div>
                      <div class="text-grey-6 font-mono" style="font-size: 8px;">{{ proc.fee * 100 }}% fee</div>
                    </q-card>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Checkout Trigger Button -->
          <div class="q-pt-md">
            <q-btn 
              unelevated 
              :color="activeManifest.color + '-10'" 
              :text-color="activeManifest.color + '-3'" 
              icon="credit_card" 
              label="EXECUTE LEDGER INTENT" 
              class="full-width text-weight-bold font-mono text-caption letter-spacing-1" 
              @click="initiateCheckout" 
              :disabled="cart.length === 0 || !customer.email || !customer.phone" 
            />
          </div>
        </q-card>
      </div>

    </div>

    <!-- Webhook Sandbox Replay Console Dialog -->
    <q-dialog v-model="paymentDialog" persistent backdrop-filter="blur(10px)">
      <q-card class="bg-card-dark border-grey-9 q-pa-lg" style="width: 520px; max-width: 90vw;">
        
        <div class="row items-center justify-between q-mb-md">
          <div class="row items-center op-gap-8">
            <q-icon name="vpn_key" color="amber-4" size="sm" />
            <div class="text-h6 text-weight-bold text-white font-mono" style="font-size: 14px;">Quasar Webhook Sandbox Console</div>
          </div>
          <q-btn flat round dense color="grey-5" icon="close" @click="paymentDialog = false" />
        </div>

        <q-separator dark class="q-my-md opacity-10" />

        <!-- Verification Steps progress bar -->
        <div class="bg-black-transparent border-grey-9 q-pa-md rounded-borders font-mono text-metric-sm text-grey-4 q-mb-md" style="font-size: 10.5px; line-height: 1.6; min-height: 150px;">
          <div v-for="(log, idx) in webhookLogs" :key="idx" class="q-mb-xs">
            <span class="text-amber-4">></span> {{ log }}
          </div>
          <div v-if="verificationStep < 4" class="row items-center op-gap-6 text-yellow-4 animate-pulse q-mt-sm">
            <span class="live-indicator-dot bg-yellow-5"></span>
            <span>Attaching verification signatures...</span>
          </div>
          <div v-else class="text-green-4 text-weight-bold q-mt-sm">
            [WEBHOOK EXECUTION SUCCESSFUL] Ledger state synchronized!
          </div>
        </div>

        <q-linear-progress :value="verificationStep / 4" color="amber-4" dark class="rounded-borders q-mb-md" />

        <div class="row justify-end q-mt-md">
          <q-btn flat color="grey-5" label="Abort Sandbox" @click="paymentDialog = false" class="text-weight-bold font-mono" :disabled="verificationStep < 4" />
          <q-btn unelevated color="amber-10" label="Reconcile and Close" @click="completePayment" class="text-weight-bold font-mono text-amber-3 q-ml-sm" :disabled="verificationStep < 4" />
        </div>

      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// Active Industry Mode
const activeIndustry = ref(localStorage.getItem('tenant_type') || 'school')

// Active Processor Selection
const PROCESSORS = [
  { name: 'Paystack', icon: 'account_balance', fee: 0.015 },
  { name: 'Flutterwave', icon: 'payments', fee: 0.015 },
  { name: 'Stripe', icon: 'credit_card', fee: 0.039 }
]
const activeProcessor = ref(PROCESSORS[0])

// Customer Details
const customer = ref({
  email: 'parent@academy.com',
  phone: '+234 8129031120'
})

// Cart state
const cart = ref([])

const addToCart = (item) => {
  cart.value.push(item)
  $q.notify({
    type: 'info',
    message: `Added ${item.name} to checkout intent.`,
    timeout: 1000
  })
}

const removeFromCart = (idx) => {
  cart.value.splice(idx, 1)
}

// Financial Calculations
const subtotal = computed(() => {
  return cart.value.reduce((acc, curr) => acc + curr.price, 0)
})

const processingFee = computed(() => {
  return Math.round(subtotal.value * activeProcessor.value.fee)
})

const grandTotal = computed(() => {
  return subtotal.value + processingFee.value
})

// Industry Manifest items definitions
const INDUSTRY_ITEMS = {
  school: {
    color: 'indigo',
    glowRgb: '99,102,241',
    items: [
      { name: 'Grade 10 Tuition Fee', price: 120000, icon: 'school' },
      { name: 'Academy Sports Kit', price: 15000, icon: 'fitness_center' },
      { name: 'School Bus Term Transit', price: 45000, icon: 'directions_bus' },
      { name: 'Science Lab Manuals', price: 8500, icon: 'menu_book' },
      { name: 'MFA Identity Token Card', price: 5000, icon: 'vpn_key' }
    ]
  },
  retail: {
    color: 'amber',
    glowRgb: '245,158,11',
    items: [
      { name: 'Invify Tablet Terminal', price: 95000, icon: 'phone_android' },
      { name: 'SKU Pack: Grid Paper', price: 12500, icon: 'description' },
      { name: 'Bar-code Laser Scanner', price: 32000, icon: 'qr_code_scanner' },
      { name: 'POS Thermal Roll Pack', price: 8000, icon: 'print' },
      { name: 'Heavy Duty Money Safe', price: 150000, icon: 'lock' }
    ]
  },
  hospitality: {
    color: 'green',
    glowRgb: '16,185,129',
    items: [
      { name: 'Suite 204 Deluxe Booking', price: 85000, icon: 'king_bed' },
      { name: 'Standard Room Overnight', price: 45000, icon: 'hotel' },
      { name: 'F&B Dinner Buffet Ticket', price: 18000, icon: 'restaurant' },
      { name: 'Airport Shuttle Transit', price: 25000, icon: 'airport_shuttle' },
      { name: 'Premium Room Bar Tab', price: 12000, icon: 'local_bar' }
    ]
  },
  logistics: {
    color: 'purple',
    glowRgb: '139,92,246',
    items: [
      { name: 'Heavy Duty Fleet Transit', price: 180000, icon: 'local_shipping' },
      { name: 'City Dispatch Drop-off', price: 15000, icon: 'navigation' },
      { name: 'Warehousing Storage Box', price: 35000, icon: 'inventory' },
      { name: 'Driver GPS Smart Tracker', price: 24000, icon: 'explore' },
      { name: 'Container Seal Lock', price: 6500, icon: 'vpn_key' }
    ]
  },
  healthcare: {
    color: 'red',
    glowRgb: '239,68,68',
    items: [
      { name: 'General Physician Checkup', price: 15000, icon: 'healing' },
      { name: 'Pediatric Specialist Block', price: 25000, icon: 'child_care' },
      { name: 'Amoxicillin 500mg Pack', price: 8400, icon: 'medication' },
      { name: 'Laboratory Blood Diagnostics', price: 18500, icon: 'science' },
      { name: 'Emergency Clinic Room Block', price: 120000, icon: 'hotel' }
    ]
  }
}

const activeManifest = computed(() => {
  return INDUSTRY_ITEMS[activeIndustry.value] || INDUSTRY_ITEMS.school
})

// Webhook Sandbox Verification Console state
const paymentDialog = ref(false)
const verificationStep = ref(0)
const webhookLogs = ref([])
let timer = null

const initiateCheckout = () => {
  webhookLogs.value = [
    `[Quasar Intent] Formulating intent for ref: TX-${Math.floor(Math.random() * 100000) + 800000}-QS`,
    `[Processor Mapping] Gateway route configured: ${activeProcessor.value.name}`,
    `[HMAC Signature] Generating verification checkblock with webhook secret...`
  ]
  verificationStep.value = 0
  paymentDialog.value = true

  let step = 0
  timer = setInterval(() => {
    step++
    verificationStep.value = step

    if (step === 1) {
      webhookLogs.value.push(`[Webhook Replay Guard] Validating nonce replay verification indices... [OK]`)
    } else if (step === 2) {
      const hmacVal = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`
      webhookLogs.value.push(`[HMAC sha256 Signature Match] Verified: ${hmacVal}`)
    } else if (step === 3) {
      webhookLogs.value.push(`[Ledger Verification] Matching balance constraints and sweep lines...`)
    } else if (step === 4) {
      webhookLogs.value.push(`[Convergence Engine] State matches backend source of truth with 100% telemetry SLA!`)
      clearInterval(timer)
    }
  }, 600)
}

const completePayment = () => {
  // Push transaction to localstorage database to simulate dynamic real-time ledger synchronization
  const storedTx = JSON.parse(localStorage.getItem('tenant_transactions') || '[]')
  
  const randRef = `TX-${Math.floor(Math.random() * 100000) + 800000}-QS`
  const newTx = {
    id: Date.now(),
    type: 'sale',
    desc: `${activeIndustry.value === 'school' ? 'Tuition/Academy Fee Received' : 'POS Checkout Approved'}`,
    ref: randRef,
    amount: grandTotal.value,
    processor: activeProcessor.value.name,
    customer: customer.value.email,
    device: 'POS-TERM-01',
    time: 'Just now',
    status: 'CLEARED',
    hash: `sha256-` + Math.random().toString(36).substring(2, 15)
  }

  storedTx.unshift(newTx)
  localStorage.setItem('tenant_transactions', JSON.stringify(storedTx))

  paymentDialog.value = false
  cart.value = []
  
  $q.notify({
    type: 'positive',
    message: `Payment intention executed successfully via Quasar ${activeProcessor.value.name}!`,
    timeout: 2000
  })
}
</script>

<style scoped>
.ambient-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 400px;
  pointer-events: none;
  z-index: 1;
  transition: background 0.8s ease;
}

.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }

.item-card {
  background: #090c15;
  border-radius: 12px;
}

.item-card:hover {
  transform: translateY(-2px);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 8px 20px -5px rgba(99, 102, 241, 0.15);
}

.border-active {
  border: 1px solid #4f46e5 !important;
}

.hover-bg:hover {
  background: rgba(255, 255, 255, 0.02) !important;
}

.border-top {
  border-top: 1px solid rgba(255,255,255,0.06);
}

.letter-spacing-1 { letter-spacing: 1px; }
.transition-3 { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
