<template>
  <q-card class="bg-card-dark text-white shadow-2 q-pa-md rounded-borders overflow-hidden relative-position column h-full border-amber-left" style="min-height: 140px;">
    <div class="absolute-right q-pa-md opacity-20" style="top: -20px; right: -20px;">
      <q-icon name="account_balance" size="160px" />
    </div>
    <div class="column justify-between h-full z-index-1">
      <div class="row items-center justify-between q-mb-xs">
        <span class="text-overline text-amber-5 letter-spacing-1" style="font-size: 8.5px; letter-spacing: 1.5px;">HELD WITH INVIFY / QUASAR</span>
        <q-btn flat round dense size="xs" color="amber-5" icon="refresh" :loading="resyncing" @click="resyncFromQuasar" />
      </div>

      <div class="text-h4 text-weight-bolder text-amber-4 q-my-xs">
        {{ financeStore.summary?.platformHeldFormatted || '---' }}
      </div>

      <div class="text-caption text-grey-5">
        This is live money still sitting on Quasar virtual accounts (parents, students, customers). It is not the ₦ sales on this page. Card/own-bank/cash invoices never increase this number.
      </div>
      <div class="row items-center justify-between q-mt-xs text-caption">
        <span class="text-grey-5">In: {{ financeStore.summary?.platformCollectedFormatted || '₦0.00' }}</span>
        <span class="text-grey-5">Out: {{ financeStore.summary?.platformRemittedFormatted || '₦0.00' }}</span>
      </div>
      <div class="column q-mt-xs text-caption op-gap-4">
        <span class="text-amber-5">Live Quasar VA: {{ financeStore.summary?.quasarLiveFormatted || financeStore.summary?.unsweptVaFormatted || '₦0.00' }}</span>
        <span v-if="financeStore.summary?.quasarBalanceStatus === 'invify_overstated'" class="text-negative">
          Investigate: Invify logged {{ financeStore.summary?.invifyLoggedVaFormatted }} is higher than live Quasar. Showing live Quasar (tablet + webhook double sync).
        </span>
        <span class="text-grey-5">Invify VA log: {{ financeStore.summary?.invifyLoggedVaFormatted || '₦0.00' }}</span>
        <span class="text-grey-5">Customer VA wallets: {{ financeStore.summary?.unsweptCustomerVaFormatted || '₦0.00' }}</span>
        <span class="text-grey-5">Parent VA wallets: {{ financeStore.summary?.unsweptParentVaFormatted || '₦0.00' }}</span>
        <span class="text-grey-5">Student VA wallets: {{ financeStore.summary?.unsweptStudentVaFormatted || '₦0.00' }}</span>
        <span class="text-grey-5">Staff VA wallets: {{ financeStore.summary?.unsweptStaffVaFormatted || '₦0.00' }}</span>
        <span class="text-grey-5">Unmapped VA: {{ financeStore.summary?.unsweptUnmappedVaFormatted || '₦0.00' }}</span>
      </div>
    </div>
  </q-card>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useFinanceStore } from '../../stores/finance.store';

const financeStore = useFinanceStore();
const $q = useQuasar();
const resyncing = ref(false);

const fetchData = async (force = false) => {
  await financeStore.fetchSummary(force);
};

const resyncFromQuasar = async () => {
  if (resyncing.value) return;
  resyncing.value = true;
  try {
    const result = await financeStore.resyncQuasarHeld();
    const imported = Number(result.imported || 0);
    const scanned = Number(result.scanned || 0);
    $q.notify({
      type: 'positive',
      message: imported > 0
        ? `Quasar synced. ${imported} missing credit${imported === 1 ? '' : 's'} added from the last 50 transactions or 20 days.`
        : `Quasar is up to date. Checked ${scanned} credit${scanned === 1 ? '' : 's'} from the last 50 transactions or 20 days.`,
    });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.error || err?.message || 'Could not resync Quasar funds',
    });
  } finally {
    resyncing.value = false;
  }
};

onMounted(() => {
  fetchData(true);
});
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1.5px; }
.opacity-20 { opacity: 0.12; }
.z-index-1 { z-index: 1; }
.h-full { height: 100%; }
.op-gap-4 { gap: 4px; }
.bg-card-dark { background-color: #12191c; }
.border-amber-left { border-left: 3px solid #f59e0b; }
</style>
