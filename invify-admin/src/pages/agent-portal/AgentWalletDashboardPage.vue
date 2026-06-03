<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16" style="height: calc(100vh - 50px); overflow-y: auto;">
    
    <!-- Header -->
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="account_balance_wallet" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-weight-bold" style="font-size: 16px;">FINANCIAL OPERATIONS</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">{{ wallet?.id || 'LOADING' }} // WALLET_LEDGER</div>
        </div>
      </div>
      <div>
        <q-btn color="amber-4" text-color="black" label="Request Withdrawal" @click="showWithdrawalModal = true" />
      </div>
    </div>

    <div v-if="loading" class="flex flex-center col">
      <q-spinner color="amber-4" size="3em" />
    </div>

    <!-- Main Workspace -->
    <div v-else class="column op-gap-16 pb-4">
      
      <!-- ROW 1: TOP KPI CARDS -->
      <div class="row op-gap-16">
        <!-- Available Balance -->
        <div class="col-xs-12 col-sm bg-panel-darker q-pa-md rounded-borders border-muted column justify-between">
          <div class="text-muted text-uppercase text-caption">Available Balance</div>
          <div class="text-h4 text-weight-bold text-amber-4 q-my-sm">₦{{ Number(kpiData.availableBalance).toLocaleString() }}</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">Ready for withdrawal</div>
        </div>
        <!-- Pending Earnings -->
        <div class="col-xs-12 col-sm bg-panel-darker q-pa-md rounded-borders border-muted column justify-between">
          <div class="text-muted text-uppercase text-caption">Pending Earnings</div>
          <div class="text-h4 text-weight-bold text-white q-my-sm">₦{{ Number(kpiData.pendingEarnings).toLocaleString() }}</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">Awaiting clearance</div>
        </div>
        <!-- Total Earnings -->
        <div class="col-xs-12 col-sm bg-panel-darker q-pa-md rounded-borders border-muted column justify-between">
          <div class="text-muted text-uppercase text-caption">Total Earnings</div>
          <div class="text-h4 text-weight-bold text-white q-my-sm">₦{{ Number(kpiData.totalEarnings).toLocaleString() }}</div>
          <div class="text-metric-mono text-green-4" style="font-size: 10px;">Lifetime total</div>
        </div>
        <!-- Total Withdrawn -->
        <div class="col-xs-12 col-sm bg-panel-darker q-pa-md rounded-borders border-muted column justify-between">
          <div class="text-muted text-uppercase text-caption">Total Withdrawn</div>
          <div class="text-h4 text-weight-bold text-white q-my-sm">₦{{ Number(kpiData.totalWithdrawn).toLocaleString() }}</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">Lifetime withdrawals</div>
        </div>
        <!-- This Month -->
        <div class="col-xs-12 col-sm bg-panel-darker q-pa-md rounded-borders border-muted column justify-between">
          <div class="text-muted text-uppercase text-caption">This Month</div>
          <div class="text-h4 text-weight-bold text-green-4 q-my-sm">₦{{ Number(kpiData.thisMonthEarnings).toLocaleString() }}</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">Rolling 30 days</div>
        </div>
      </div>

      <!-- ROW 2: COMMISSION BREAKDOWN -->
      <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-16">
        <div class="text-h6 text-weight-bold">Commission Breakdown</div>
        <div class="row op-gap-16">
          <div v-for="(val, key) in commissionCategories" :key="key" class="col bg-panel-darker q-pa-sm rounded-borders border-muted row items-center justify-between">
            <div class="text-caption text-uppercase">{{ key.replace(/_/g, ' ') }}</div>
            <div class="text-weight-bold text-amber-4">₦{{ Number(val).toLocaleString() }}</div>
          </div>
        </div>
      </div>

      <!-- ROW 3: FINANCIAL ANALYTICS -->
      <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-16">
        <div class="text-h6 text-weight-bold">Financial Analytics</div>
        <div class="row op-gap-16">
          <div class="col-xs-12 col-md-6 border-muted bg-panel-darker rounded-borders q-pa-sm" style="height: 300px;">
            <apexchart v-if="chartReady" type="area" height="100%" :options="trendOptions" :series="trendSeries" />
            <div v-else class="full-height flex flex-center text-muted">Chart Loading...</div>
          </div>
          <div class="col-xs-12 col-md-6 border-muted bg-panel-darker rounded-borders q-pa-sm" style="height: 300px;">
            <apexchart v-if="chartReady" type="donut" height="100%" :options="donutOptions" :series="donutSeries" />
            <div v-else class="full-height flex flex-center text-muted">Chart Loading...</div>
          </div>
        </div>
      </div>

      <!-- ROW 4 & 5: RECENT COMMISSIONS & LEDGER -->
      <div class="row op-gap-16">
        
        <div class="col-xs-12 col-md-6 bg-panel border-muted rounded-borders q-pa-md column">
          <div class="text-h6 text-weight-bold border-bottom-light q-pb-sm q-mb-md">Recent Commissions</div>
          <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
            <thead class="text-muted text-metric-mono" style="font-size: 10px;">
              <tr>
                <th class="q-pa-sm border-bottom">Type</th>
                <th class="q-pa-sm border-bottom">Amount</th>
                <th class="q-pa-sm border-bottom">Date</th>
              </tr>
            </thead>
            <tbody class="text-caption">
              <tr v-for="c in commissions.slice(0, 5)" :key="c.id" class="border-bottom-light">
                <td class="q-pa-sm text-uppercase">{{ c.event_type }}</td>
                <td class="q-pa-sm text-green-4 text-weight-bold">+₦{{ Number(c.amount).toLocaleString() }}</td>
                <td class="q-pa-sm">{{ new Date(c.created_at).toLocaleDateString() }}</td>
              </tr>
              <tr v-if="!commissions.length">
                <td colspan="3" class="q-pa-sm text-muted text-center">No recent commissions.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="col-xs-12 col-md-6 bg-panel border-muted rounded-borders q-pa-md column">
          <div class="text-h6 text-weight-bold border-bottom-light q-pb-sm q-mb-md">Wallet Ledger</div>
          <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
            <thead class="text-muted text-metric-mono" style="font-size: 10px;">
              <tr>
                <th class="q-pa-sm border-bottom">Txn ID</th>
                <th class="q-pa-sm border-bottom">Type</th>
                <th class="q-pa-sm border-bottom">Amount</th>
                <th class="q-pa-sm border-bottom">Date</th>
              </tr>
            </thead>
            <tbody class="text-caption">
              <tr v-for="l in ledger.slice(0, 5)" :key="l.id" class="border-bottom-light">
                <td class="q-pa-sm text-metric-mono">{{ String(l.id).substring(0, 8) }}</td>
                <td class="q-pa-sm text-uppercase">{{ l.transaction_type }}</td>
                <td class="q-pa-sm" :class="l.credit > 0 ? 'text-green-4' : 'text-red-4'">
                  {{ l.credit > 0 ? '+' : '-' }}₦{{ Number(l.credit > 0 ? l.credit : l.debit).toLocaleString() }}
                </td>
                <td class="q-pa-sm">{{ new Date(l.created_at).toLocaleDateString() }}</td>
              </tr>
              <tr v-if="!ledger.length">
                <td colspan="4" class="q-pa-sm text-muted text-center">No ledger entries found.</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <!-- ROW 6 & 7: WITHDRAWAL REQUESTS & BANK ACCOUNT -->
      <div class="row op-gap-16">
        
        <div class="col-xs-12 col-md-8 bg-panel border-muted rounded-borders q-pa-md column">
          <div class="text-h6 text-weight-bold border-bottom-light q-pb-sm q-mb-md">Withdrawal Requests</div>
          <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
            <thead class="text-muted text-metric-mono" style="font-size: 10px;">
              <tr>
                <th class="q-pa-sm border-bottom">Bank</th>
                <th class="q-pa-sm border-bottom">Amount</th>
                <th class="q-pa-sm border-bottom">Status</th>
                <th class="q-pa-sm border-bottom">Date</th>
              </tr>
            </thead>
            <tbody class="text-caption">
              <tr v-for="w in withdrawals" :key="w.id" class="border-bottom-light">
                <td class="q-pa-sm">{{ w.bank_name }} <br><span class="text-muted text-metric-mono">{{ w.account_number }}</span></td>
                <td class="q-pa-sm text-weight-bold">₦{{ Number(w.amount).toLocaleString() }}</td>
                <td class="q-pa-sm">
                  <q-badge :color="getWithdrawalColor(w.status)" text-color="black">{{ w.status }}</q-badge>
                </td>
                <td class="q-pa-sm">{{ new Date(w.created_at).toLocaleString() }}</td>
              </tr>
              <tr v-if="!withdrawals.length">
                <td colspan="4" class="q-pa-sm text-muted text-center">No withdrawal requests found.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="col-xs-12 col-md-4 bg-panel border-muted rounded-borders q-pa-md column">
          <div class="text-h6 text-weight-bold border-bottom-light q-pb-sm q-mb-md">Linked Bank Account</div>
          <div v-if="primaryBank" class="bg-panel-darker border-muted rounded-borders q-pa-md column op-gap-8">
            <q-icon name="account_balance" size="lg" color="amber-4" />
            <div class="text-weight-bold text-h6">{{ primaryBank.bank_name }}</div>
            <div class="text-metric-mono text-muted" style="letter-spacing: 2px;">{{ primaryBank.account_number }}</div>
            <div class="text-uppercase text-caption">{{ primaryBank.account_name }}</div>
            <q-btn flat dense color="red-4" label="Change Account" class="q-mt-sm" @click="showBankModal = true" />
          </div>
          <div v-else class="flex flex-center column text-muted op-gap-8 q-pa-lg border-muted border-dashed rounded-borders">
            <q-icon name="account_balance" size="lg" />
            <div>No bank account linked.</div>
            <q-btn color="amber-4" text-color="black" label="Link Account" @click="showBankModal = true" />
          </div>
        </div>

      </div>

    </div>

    <!-- Modals -->
    <q-dialog v-model="showWithdrawalModal" persistent>
      <q-card class="bg-panel text-main" style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Request Withdrawal</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="column op-gap-16 q-pt-md">
          <div class="text-caption text-amber-4">Available: ₦{{ Number(kpiData.availableBalance).toLocaleString() }}</div>
          <q-input dark outlined v-model.number="withdrawalForm.amount" type="number" label="Amount to Withdraw" color="amber-4" />
          <div v-if="primaryBank" class="text-caption text-muted">
            Payout to: {{ primaryBank.bank_name }} - {{ primaryBank.account_number }}
          </div>
          <div v-else class="text-red-4 text-caption">Please link a bank account first.</div>
          
          <q-input dark outlined v-model="withdrawalForm.password" type="password" label="Confirm Password (MFA)" color="amber-4" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="white" v-close-popup />
          <q-btn label="Submit" color="amber-4" text-color="black" @click="submitWithdrawal" :loading="submitting" :disable="!primaryBank || withdrawalForm.amount <= 0 || withdrawalForm.amount > kpiData.availableBalance" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showBankModal" persistent>
      <q-card class="bg-panel text-main" style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Link Bank Account</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="column op-gap-16 q-pt-md">
          <q-input dark outlined v-model="bankForm.bank_name" label="Bank Name" color="amber-4" />
          <q-input dark outlined v-model="bankForm.account_number" label="Account Number" color="amber-4" />
          <q-input dark outlined v-model="bankForm.account_name" label="Account Name" color="amber-4" />
          <q-input dark outlined v-model="bankForm.password" type="password" label="Confirm Password (MFA)" color="amber-4" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="white" v-close-popup />
          <q-btn label="Save" color="amber-4" text-color="black" @click="submitBank" :loading="submitting" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

const $q = useQuasar()
const router = useRouter()
const loading = ref(true)
const submitting = ref(false)

const kpiData = ref({ availableBalance: 0, pendingEarnings: 0, totalEarnings: 0, totalWithdrawn: 0, thisMonthEarnings: 0 })
const ledger = ref([])
const commissions = ref([])
const withdrawals = ref([])
const bankAccounts = ref([])
const primaryBank = computed(() => bankAccounts.value.find(b => b.is_primary) || bankAccounts.value[0])

const showWithdrawalModal = ref(false)
const showBankModal = ref(false)

const withdrawalForm = ref({ amount: 0, password: '' })
const bankForm = ref({ bank_name: '', account_number: '', account_name: '', password: '' })

// Charts
const chartReady = ref(false)
const trendSeries = ref([{ name: 'Earnings', data: [0, 0, 0, 0, 0, 0, 0] }])
const trendOptions = ref({
  chart: { type: 'area', foreColor: '#868e96', toolbar: { show: false }, background: 'transparent' },
  colors: ['#ffc107'],
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
  dataLabels: { enabled: false },
  xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  theme: { mode: 'dark' }
})

const donutSeries = ref([0, 0, 0])
const donutOptions = ref({
  chart: { type: 'donut', foreColor: '#868e96', background: 'transparent' },
  labels: ['Onboarding', 'Activation', 'Bonus'],
  colors: ['#ffc107', '#4caf50', '#2196f3'],
  theme: { mode: 'dark' }
})

const commissionCategories = ref({
  MERCHANT_ONBOARDING: 0,
  MERCHANT_ACTIVATION: 0,
  BONUS: 0
})

const fetchDashboardData = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    if (!token) {
      router.push('/agent/login')
      return
    }

    const headers = { Authorization: `Bearer ${token}` }
    
    const [wRes, lRes, cRes, wdRes, bRes] = await Promise.all([
      axios.get('http://localhost:3004/api/agent/wallet', { headers }),
      axios.get('http://localhost:3004/api/agent/wallet/ledger', { headers }),
      axios.get('http://localhost:3004/api/agent/wallet/commissions', { headers }),
      axios.get('http://localhost:3004/api/agent/wallet/withdrawals', { headers }),
      axios.get('http://localhost:3004/api/agent/wallet/bank-account', { headers })
    ])

    kpiData.value = wRes.data.data
    ledger.value = lRes.data.data || []
    commissions.value = cRes.data.data || []
    withdrawals.value = wdRes.data.data || []
    bankAccounts.value = bRes.data.data || []

    processCharts()

  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Failed to load financial data' })
  } finally {
    loading.value = false
    chartReady.value = true
  }
}

const processCharts = () => {
  // Aggregate commissions
  const cats = { MERCHANT_ONBOARDING: 0, MERCHANT_ACTIVATION: 0, BONUS: 0 }
  commissions.value.forEach(c => {
    if (cats[c.event_type] !== undefined) cats[c.event_type] += Number(c.amount)
    else cats.BONUS += Number(c.amount)
  })
  commissionCategories.value = cats
  donutSeries.value = [cats.MERCHANT_ONBOARDING, cats.MERCHANT_ACTIVATION, cats.BONUS]

  // Mock trend data for UI purposes until timeseries aggregation is built
  trendSeries.value = [{
    name: 'Earnings',
    data: [
      kpiData.value.thisMonthEarnings * 0.1,
      kpiData.value.thisMonthEarnings * 0.3,
      kpiData.value.thisMonthEarnings * 0.2,
      kpiData.value.thisMonthEarnings * 0.5,
      kpiData.value.thisMonthEarnings * 0.4,
      kpiData.value.thisMonthEarnings * 0.8,
      kpiData.value.thisMonthEarnings
    ]
  }]
}

onMounted(fetchDashboardData)

const submitWithdrawal = async () => {
  submitting.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    await axios.post('http://localhost:3004/api/agent/wallet/withdrawals', {
      amount: withdrawalForm.value.amount,
      password: withdrawalForm.value.password,
      bank_name: primaryBank.value.bank_name,
      account_number: primaryBank.value.account_number,
      account_name: primaryBank.value.account_name,
      remarks: 'Agent App Withdrawal'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    $q.notify({ type: 'positive', message: 'Withdrawal requested successfully' })
    showWithdrawalModal.value = false
    withdrawalForm.value = { amount: 0, password: '' }
    await fetchDashboardData()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Withdrawal failed' })
  } finally {
    submitting.value = false
  }
}

const submitBank = async () => {
  submitting.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    await axios.post('http://localhost:3004/api/agent/wallet/bank-account', bankForm.value, {
      headers: { Authorization: `Bearer ${token}` }
    })
    $q.notify({ type: 'positive', message: 'Bank account linked successfully' })
    showBankModal.value = false
    bankForm.value = { bank_name: '', account_number: '', account_name: '', password: '' }
    await fetchDashboardData()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Update failed' })
  } finally {
    submitting.value = false
  }
}

const getWithdrawalColor = (status) => {
  if (status === 'APPROVED' || status === 'PAID') return 'green-4'
  if (status === 'REJECTED') return 'red-4'
  if (status === 'PROCESSING') return 'blue-4'
  return 'amber-4'
}
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
.border-dashed { border-style: dashed !important; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>
