<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="account_balance_wallet" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-weight-bold" style="font-size: 16px;">WALLET & COMMISSIONS</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">EARNINGS & PAYOUTS</div>
        </div>
      </div>
      <q-btn dense flat color="amber-4" icon="download" label="Withdraw Funds" />
    </div>

    <div class="row op-gap-16 shrink-0">
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md column op-gap-4 border-left-green">
        <div class="text-caption text-muted">Available Balance</div>
        <div class="text-h4 text-weight-bold text-green-4">
          <q-spinner v-if="loading" size="sm" />
          <span v-else>${{ (walletData.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) }}</span>
        </div>
      </div>
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md column op-gap-4 border-left-amber">
        <div class="text-caption text-muted">Pending Settlement</div>
        <div class="text-h4 text-weight-bold text-amber-4">
          <q-spinner v-if="loading" size="sm" />
          <span v-else>${{ (walletData.pending_clearance || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) }}</span>
        </div>
      </div>
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md column op-gap-4 border-left-cyan">
        <div class="text-caption text-muted">Total Lifetime Earnings</div>
        <div class="text-h4 text-weight-bold text-cyan-3">
          <q-spinner v-if="loading" size="sm" />
          <span v-else>${{ (walletData.total_earned || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) }}</span>
        </div>
      </div>
    </div>

    <div class="col column border-muted rounded-borders bg-panel overflow-hidden">
      <div class="panel-header bg-panel-darker q-px-sm q-py-xs border-bottom row items-center op-gap-4 shrink-0">
        <q-icon name="receipt_long" size="xs" color="amber-4" />
        <span class="text-operator-title text-weight-bold" style="font-size: 12px;">RECENT TRANSACTIONS</span>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner color="amber-4" size="3em" />
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && transactions.length === 0" class="flex flex-center q-pa-xl text-center column op-gap-8">
        <q-icon name="receipt_long" size="xl" color="grey-8" />
        <div class="text-muted text-weight-bold">No transactions found</div>
      </div>

      <div v-else class="col overflow-auto custom-scrollbar">
        <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
          <thead class="bg-panel-darker text-muted text-metric-mono text-weight-bold border-bottom sticky-header" style="font-size: 10px;">
            <tr>
              <th class="q-pa-sm">Date</th>
              <th class="q-pa-sm">Reference</th>
              <th class="q-pa-sm">Description</th>
              <th class="q-pa-sm text-right">Amount</th>
              <th class="q-pa-sm text-right">Status</th>
            </tr>
          </thead>
          <tbody class="text-caption" style="font-size: 12px;">
            <tr v-for="t in transactions" :key="t.id" class="border-bottom-light hover-row">
              <td class="q-pa-sm text-metric-mono text-muted" style="font-size: 10px;">{{ new Date(t.created_at || t.date).toLocaleString() }}</td>
              <td class="q-pa-sm text-metric-mono text-muted" style="font-size: 10px;">{{ t.id.substring(0, 8).toUpperCase() }}</td>
              <td class="q-pa-sm text-main">{{ t.description || t.transaction_type }}</td>
              <td class="q-pa-sm text-right text-weight-bold" :class="t.amount > 0 ? 'text-green-4' : 'text-red-4'">
                {{ t.amount > 0 ? '+' : '' }}${{ Math.abs(t.amount).toFixed(2) }}
              </td>
              <td class="q-pa-sm text-right">
                <q-badge :color="t.status === 'COMPLETED' ? 'green-9' : 'amber-9'" :text-color="t.status === 'COMPLETED' ? 'green-3' : 'amber-3'">
                  {{ t.status }}
                </q-badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(true)
const transactions = ref([])
const walletData = ref({})

const fetchWallet = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('agent_token') || 'mock-agent-token-123'
    const res = await axios.get('http://localhost:3004/api/finance/wallet/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
    walletData.value = res.data.data?.wallet || {}
    transactions.value = res.data.data?.ledger || []
  } catch (err) {
    console.error('Failed to fetch wallet dashboard', err)
    $q.notify({ type: 'negative', message: 'Failed to load wallet data', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchWallet)
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
.border-left-green { border-left: 3px solid #40c057; }
.border-left-amber { border-left: 3px solid #fcc419; }
.border-left-cyan { border-left: 3px solid #3bc9db; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
}

.hover-row:hover {
  background-color: #1a2327 !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #0b0f12;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #22282d;
  border-radius: 3px;
}
</style>