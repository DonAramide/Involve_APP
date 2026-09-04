<template>
  <q-card class="bg-card-dark border-grey-9 relative-position column q-pa-lg" style="border-radius: 12px;">
    <!-- Loading State -->
    <q-inner-loading :showing="financeStore.isLoading && !financeStore.summary" class="bg-black-transparent">
      <q-spinner-dots size="40px" color="indigo-4" />
    </q-inner-loading>

    <!-- Error State -->
    <div v-if="financeStore.error && !financeStore.summary" class="flex flex-center q-py-xl text-center">
      <div>
        <q-icon name="error_outline" color="red-4" size="md" />
        <div class="text-caption text-red-4 q-mt-xs">{{ financeStore.error }}</div>
        <q-btn flat dense size="sm" color="grey-5" label="Retry" class="q-mt-sm" @click="fetchData(true)" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!financeStore.isLoading && !financeStore.summary" class="flex flex-center q-py-xl text-center">
      <div>
        <q-icon name="hourglass_empty" color="grey-6" size="md" />
        <div class="text-caption text-grey-5 q-mt-xs">No sales data available</div>
      </div>
    </div>

    <!-- Success State -->
    <div v-else-if="financeStore.summary?.salesSummary" class="column op-gap-20">
      <!-- Title Header -->
      <div class="row items-center justify-between">
        <div class="row items-center op-gap-8">
          <q-icon name="analytics" color="indigo-3" size="sm" />
          <span class="text-operator-title text-indigo-3 text-weight-bold text-uppercase font-mono" style="font-size: 11px; letter-spacing: 1.5px;">
            Sales Summary For Period
          </span>
        </div>
        <div class="row items-center op-gap-8">
          <span class="text-caption text-grey-5">{{ financeStore.summary.salesSummary.invoiceCount }} Invoices</span>
          <span class="live-indicator-dot pulse-healthy"></span>
          <q-btn flat round dense size="xs" color="grey-6" icon="refresh" @click="fetchData(true)" />
        </div>
      </div>

      <!-- Metrics Row: Total Invoiced vs Total Collected -->
      <div class="row q-col-gutter-lg justify-center q-py-sm">
        <div class="col-12 col-sm-6 text-center border-right-grey-9">
          <div class="text-overline text-grey-5 font-mono">Total Invoiced</div>
          <div class="text-h3 text-weight-bolder text-indigo-3 text-metric-mono q-my-xs">
            ₦{{ Number(financeStore.summary.salesSummary.totalInvoiced).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </div>
        </div>
        <div class="col-12 col-sm-6 text-center">
          <div class="text-overline text-grey-5 font-mono">Total Collected</div>
          <div class="text-h3 text-weight-bolder text-green-4 text-metric-mono q-my-xs">
            ₦{{ Number(financeStore.summary.salesSummary.totalCollected).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </div>
        </div>
      </div>

      <q-separator dark class="q-my-xs" />

      <div class="text-caption text-grey-5 q-mb-sm">
        Card and VA transfer sit with Invify/Quasar. Own-bank transfer went to the tenant’s personal account and is not held by Invify. Cash stayed in the shop. Customer wallet is store credit applied to invoices.
      </div>

      <!-- Payment Channels Breakdown Row -->
      <div class="row q-col-gutter-md justify-between">
        <!-- Card POS -->
        <div class="col-6 col-sm-4 col-md column items-center text-center">
          <span class="text-caption text-amber-5 text-weight-bold font-mono">CARD (POS)</span>
          <span class="text-h6 text-white text-weight-bold text-metric-mono q-mt-xs">
            ₦{{ Number(financeStore.summary.salesSummary.card).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </span>
        </div>

        <!-- VA Transfer (Quasar) -->
        <div class="col-6 col-sm-4 col-md column items-center text-center border-left-grey-9">
          <span class="text-caption text-purple-3 text-weight-bold font-mono">
            VA TRANSFER
            <q-tooltip>Paid into a customer or staff Invify/Quasar virtual account</q-tooltip>
          </span>
          <span class="text-h6 text-white text-weight-bold text-metric-mono q-mt-xs">
            ₦{{ Number(vaTransferAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </span>
        </div>

        <!-- Tenant personal / company bank — not Quasar -->
        <div class="col-6 col-sm-4 col-md column items-center text-center border-left-grey-9">
          <span class="text-caption text-blue-3 text-weight-bold font-mono">
            OWN BANK
            <q-tooltip>Paid into the tenant’s own bank account. Not held by Invify/Quasar.</q-tooltip>
          </span>
          <span class="text-h6 text-white text-weight-bold text-metric-mono q-mt-xs">
            ₦{{ Number(bankTransferAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </span>
        </div>

        <!-- Cash -->
        <div class="col-6 col-sm-4 col-md column items-center text-center border-left-grey-9">
          <span class="text-caption text-cyan-4 text-weight-bold font-mono">CASH</span>
          <span class="text-h6 text-white text-weight-bold text-metric-mono q-mt-xs">
            ₦{{ Number(financeStore.summary.salesSummary.cash).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </span>
        </div>

        <!-- Total customer store credit applied to invoices -->
        <div class="col-6 col-sm-4 col-md column items-center text-center border-left-grey-9">
          <span class="text-caption text-orange-4 text-weight-bold font-mono">
            TOTAL CUSTOMER WALLET (DEBT)
            <q-tooltip>Total customer store credit used to pay invoices this period. Not Quasar float and not the tenant payout wallet.</q-tooltip>
          </span>
          <span class="text-h6 text-white text-weight-bold text-metric-mono q-mt-xs">
            ₦{{ Number(financeStore.summary.salesSummary.wallet).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </span>
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useFinanceStore } from '../../stores/finance.store';

const financeStore = useFinanceStore();

const vaTransferAmount = computed(() =>
  Number(financeStore.summary?.salesSummary?.vaTransfer || 0)
);
const bankTransferAmount = computed(() =>
  Number(
    financeStore.summary?.salesSummary?.bankTransfer ??
    financeStore.summary?.salesSummary?.transfer ??
    0
  )
);

const fetchData = async (forceRefresh = false) => {
  await financeStore.fetchSummary(forceRefresh);
};

onMounted(() => {
  fetchData(true);
});
</script>

<style scoped>
.bg-card-dark { background-color: #12191c; }
.border-grey-9 { border: 1px solid #2d3748; }
.border-right-grey-9 { border-right: 1px solid #2d3748; }
.border-left-grey-9 { border-left: 1px solid #2d3748; }
.op-gap-8 { gap: 8px; }
.op-gap-20 { gap: 20px; }
.font-mono { font-family: monospace; }
.text-metric-mono { font-family: 'Outfit', sans-serif; letter-spacing: -0.5px; }
.text-indigo-3 { color: #818cf8; }
.text-green-4 { color: #4ade80; }
.text-purple-3 { color: #c084fc; }
.text-blue-3 { color: #93c5fd; }
.text-cyan-4 { color: #22d3ee; }
.text-amber-5 { color: #f59e0b; }
.text-orange-4 { color: #fb923c; }

/* Pulse Indicator */
.live-indicator-dot {
  width: 6px;
  height: 6px;
  background-color: #4ade80;
  border-radius: 50%;
  display: inline-block;
}
.pulse-healthy {
  animation: pulse-animation 2s infinite;
}
@keyframes pulse-animation {
  0% {
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(74, 222, 128, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0);
  }
}
@media (max-width: 599px) {
  .border-right-grey-9 { border-right: none; border-bottom: 1px solid #2d3748; padding-bottom: 12px; }
  .border-left-grey-9 { border-left: none; }
}
</style>
