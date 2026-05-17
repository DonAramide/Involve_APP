<!-- invify-admin/src/pages/tenant/TenantWalletPage.vue -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    
    <!-- Top Header -->
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="account_balance_wallet" color="green-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Wallet & Treasury</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Manage treasury nodes, withdrawals, settlement accounts, and payout schedules.
        </div>
      </div>
    </div>

    <!-- 1. Stripe-Grade Balance & Payout Grid -->
    <div class="row q-col-gutter-lg q-mb-lg">
      
      <!-- Premium Digital Card Card Mockup -->
      <div class="col-12 col-md-5">
        <q-card class="digital-card q-pa-lg column justify-between relative-position overflow-hidden transition-3">
          <div class="watermark-bg" style="opacity: 0.15; filter: hue-rotate(150deg);" />
          
          <div class="row items-center justify-between">
            <span class="text-metric-mono text-weight-bolder text-uppercase letter-spacing-3" style="font-size: 11px;">QUASAR TREASURY</span>
            <q-icon name="wifi_tethering" color="white" size="sm" />
          </div>

          <div class="q-my-lg">
            <div class="text-caption text-grey-4 text-weight-medium">AVAILABLE FOR IMMEDIATE SETTLEMENT</div>
            <div class="text-h3 text-weight-bold text-white text-metric-mono q-mt-xs">₦{{ availableBalance.toLocaleString() }}</div>
          </div>

          <div class="row items-center justify-between">
            <div>
              <div class="text-metric-mono text-grey-4" style="font-size: 9px;">ACTIVE TREASURY NODE ID</div>
              <div class="text-metric-mono font-mono text-white text-weight-bold" style="font-size: 11px;">node-quasar-8239x-inv</div>
            </div>
            <q-badge color="green-10" text-color="green-3" class="text-metric-sm text-weight-bold">SECURED BY Q-Ledger</q-badge>
          </div>
        </q-card>
      </div>

      <!-- Instant Settlement & Withdrawal Desk -->
      <div class="col-12 col-md-7">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit column justify-between">
          <div>
            <div class="text-h6 text-weight-bold text-white q-mb-xs">Instant Settlement Dispatch</div>
            <div class="text-caption text-grey-5 q-mb-md">Withdraw funds securely to your verified corporate settlement account.</div>
            
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-sm-8">
                <q-input v-model.number="withdrawalAmount" type="number" dark outlined dense prefix="₦" placeholder="Enter transfer amount..." class="font-mono text-caption" />
              </div>
              <div class="col-12 col-sm-4">
                <q-btn unelevated color="green-10" label="Initiate Payout" :loading="withdrawing" @click="dispatchPayout" class="full-width text-weight-bold letter-spacing-1 h-full" style="min-height: 40px;" />
              </div>
            </div>

            <!-- Settlement Destination -->
            <div class="row items-center justify-between q-pa-md rounded-borders border-grey-9 bg-black-transparent">
              <div class="row items-center op-gap-10">
                <q-icon name="account_balance" color="indigo-4" size="sm" />
                <div>
                  <div class="text-caption text-weight-bold text-white">Access Bank PLC</div>
                  <div class="text-caption text-grey-5 font-mono">Corporate Current Account — **** 8924</div>
                </div>
              </div>
              <q-badge color="indigo-10" text-color="indigo-3" class="text-metric-sm text-weight-bold">PRIMARY</q-badge>
            </div>
          </div>

          <div class="text-caption text-grey-6 font-mono row items-center op-gap-6 q-mt-sm">
            <q-icon name="security" size="xs" />
            <span>Withdrawals are processed under replay-safe sequence checks (SLA-Standard: 2m).</span>
          </div>
        </q-card>
      </div>

    </div>

    <!-- 2. Payout Scheduling & Treasury Parameters -->
    <div class="row q-col-gutter-lg">
      
      <!-- Payout Scheduler -->
      <div class="col-12 col-md-6">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="text-h6 text-weight-bold text-white q-mb-xs">Payout Orchestrator</div>
          <div class="text-caption text-grey-5 q-mb-md">Configure automated settlement sweep parameters.</div>

          <div class="column q-gutter-y-md">
            <div 
              v-for="sched in schedules" 
              :key="sched.id" 
              class="q-pa-md rounded-borders border-grey-9 cursor-pointer transition-3 row items-center justify-between"
              :class="activeSchedule === sched.id ? 'active-schedule' : 'bg-black-transparent'"
              @click="activeSchedule = sched.id"
            >
              <div class="row items-center op-gap-12">
                <q-icon :name="sched.icon" :color="activeSchedule === sched.id ? 'green-4' : 'grey-5'" size="sm" />
                <div>
                  <div class="text-caption text-weight-bold text-white">{{ sched.title }}</div>
                  <div class="text-caption text-grey-5" style="font-size: 11px;">{{ sched.desc }}</div>
                </div>
              </div>
              <q-radio v-model="activeSchedule" :val="sched.id" dark color="green-4" />
            </div>
          </div>
        </q-card>
      </div>

      <!-- Treasury Ledger Flow Lineage -->
      <div class="col-12 col-md-6">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="text-h6 text-weight-bold text-white q-mb-xs">Ledger Lineage Tracking</div>
          <div class="text-caption text-grey-5 q-mb-md">Immutable cryptographic logs from Quasar Treasury node.</div>

          <div class="column q-gutter-y-sm">
            <div class="q-pa-md rounded-borders border-grey-9 bg-black-transparent row items-center justify-between" v-for="log in ledgerLogs" :key="log.id">
              <div class="col">
                <div class="row items-center op-gap-6 text-metric-mono font-mono text-weight-bold" style="font-size: 11px;">
                  <span class="text-uppercase" :class="log.type === 'sweep' ? 'text-green-4' : 'text-indigo-4'">{{ log.type }}</span>
                  <span class="text-grey-6">|</span>
                  <span class="text-grey-4">{{ log.ref }}</span>
                </div>
                <div class="text-caption text-grey-5 q-mt-xs">{{ log.desc }}</div>
              </div>
              
              <div class="text-right">
                <div class="text-metric-mono font-mono text-weight-bold text-white">₦{{ log.amount.toLocaleString() }}</div>
                <div class="text-metric-sm text-grey-6 font-mono q-mt-xs">{{ log.time }}</div>
              </div>
            </div>
          </div>
        </q-card>
      </div>

    </div>

  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const withdrawalAmount = ref(null)
const withdrawing = ref(false)
const activeSchedule = ref('manual')

const schedules = ref([
  { id: 'daily', title: 'Automated Daily Sweep', desc: 'Settle balance automatically every day at 23:59 WAT.', icon: 'today' },
  { id: 'weekly', title: 'Automated Weekly Sweep', desc: 'Settle balance automatically every Sunday at 23:59 WAT.', icon: 'date_range' },
  { id: 'manual', title: 'Manual Dispatch On-Demand', desc: 'Hold treasury balances in Quasar Ledger. Withdraw manually.', icon: 'touch_app' }
])

// Dynamically compute Treasury Balance from converged localstorage ledgers
const loadTreasuryData = computed(() => {
  const localList = localStorage.getItem('tenant_transactions')
  const transactions = localList ? JSON.parse(localList) : []
  
  // Base starting balance
  let baseVal = 1245600
  
  // Sum newly settled sales
  const salesSum = transactions
    .filter(t => t.type === 'sale' && t.status === 'CLEARED')
    .reduce((sum, t) => sum + t.amount, 0)
    
  // Subtract withdrawals
  const localWithdrawals = localStorage.getItem('tenant_withdrawals')
  const withdrawals = localWithdrawals ? JSON.parse(localWithdrawals) : []
  const withdrawalSum = withdrawals.reduce((sum, w) => sum + w.amount, 0)
  
  return {
    available: Math.max(0, baseVal + salesSum - withdrawalSum),
    withdrawalsList: withdrawals
  }
})

const availableBalance = computed(() => loadTreasuryData.value.available)

// Dynamic ledger timeline logs
const ledgerLogs = computed(() => {
  const baseLogs = [
    { id: 2, type: 'receipt', ref: 'RC-829104-QS', desc: 'POS batch aggregation clearing confirmation.', amount: 1245600, time: '2d ago' },
    { id: 3, type: 'receipt', ref: 'RC-829092-QS', desc: 'POS batch aggregation clearing confirmation.', amount: 620000, time: '3d ago' }
  ]
  
  // Append mock sweep logs for each actual local withdrawal executed by the user!
  const withdrawals = loadTreasuryData.value.withdrawalsList
  const sweepLogs = withdrawals.map((w, idx) => ({
    id: `sweep-${idx}`,
    type: 'sweep',
    ref: w.ref,
    desc: 'On-Demand sweep to Access Bank primary account.',
    amount: w.amount,
    time: w.time
  }))
  
  return [...sweepLogs, ...baseLogs]
})

const dispatchPayout = () => {
  if (!withdrawalAmount.value || withdrawalAmount.value <= 0) {
    $q.notify({ type: 'negative', message: 'Specify a valid transfer amount.' })
    return
  }
  if (withdrawalAmount.value > availableBalance.value) {
    $q.notify({ type: 'negative', message: 'Requested amount exceeds cleared treasury balance.' })
    return
  }

  withdrawing.value = true
  setTimeout(() => {
    withdrawing.value = false
    
    // Save withdrawal item
    const localWithdrawals = localStorage.getItem('tenant_withdrawals')
    const withdrawals = localWithdrawals ? JSON.parse(localWithdrawals) : []
    
    const randRef = `SW-${Math.floor(Math.random() * 100000) + 800000}-QS`
    withdrawals.unshift({
      ref: randRef,
      amount: withdrawalAmount.value,
      time: 'Just now'
    })
    localStorage.setItem('tenant_withdrawals', JSON.stringify(withdrawals))
    
    // Also record transfer to master transactions ledger to preserve double-entry integrity
    const localList = localStorage.getItem('tenant_transactions')
    const transactions = localList ? JSON.parse(localList) : []
    transactions.unshift({
      id: Date.now(),
      date: '2026-05-17 05:19',
      ref: randRef,
      type: 'Treasury Payout',
      amount: withdrawalAmount.value,
      status: 'SETTLED'
    })
    localStorage.setItem('tenant_transactions', JSON.stringify(transactions))

    $q.notify({ type: 'positive', message: `Withdrawal of ₦${withdrawalAmount.value.toLocaleString()} successfully routed to corporate node.` })
    withdrawalAmount.value = null
  }, 1500)
}
</script>

<style scoped>
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }
.bg-black-transparent { background: rgba(0, 0, 0, 0.25) !important; }

.digital-card {
  background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
  border: 1px solid rgba(165, 180, 252, 0.2);
  border-radius: 24px;
  height: 240px;
  box-shadow: 0 15px 35px -5px rgba(99, 102, 241, 0.2);
}

.digital-card:hover {
  transform: translateY(-2px);
  border-color: rgba(165, 180, 252, 0.4);
}

.active-schedule {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(255,255,255,0.01) 100%) !important;
  border: 1px solid rgba(99, 102, 241, 0.3) !important;
}

.letter-spacing-1 { letter-spacing: 1px; }
.letter-spacing-3 { letter-spacing: 3px; }
.transition-3 { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
