// invify-admin/src/stores/platformPayoutSettings.store.ts
// Shared store so super-admin payout changes are instantly visible on the tenant side
// without needing a page refresh.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const LS_KEY = 'platform_payout_settings';

function readFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[platformPayoutSettings] Failed to parse localStorage:', e);
  }
  return null;
}

export const usePlatformPayoutSettingsStore = defineStore('platformPayoutSettings', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const _saved = readFromStorage();

  const dailyPayoutTime   = ref<string>(_saved?.dailyPayoutTime   ?? '23:59');
  const manualDispatchFee = ref<number>(_saved?.manualDispatchFee ?? 500);
  const manualDispatchFeeType = ref<string>(_saved?.manualDispatchFeeType ?? 'Fixed Amount');

  // ── Computed ───────────────────────────────────────────────────────────────
  const isPercentage = computed(() => manualDispatchFeeType.value === 'Percentage (%)');

  function getFeeLabel(currencySymbol: string) {
    if (isPercentage.value) return `${manualDispatchFee.value}%`;
    return `${currencySymbol}${manualDispatchFee.value.toLocaleString()}`;
  }

  function computeTotal(amount: number) {
    if (isPercentage.value) {
      return amount + (amount * manualDispatchFee.value) / 100;
    }
    return amount + manualDispatchFee.value;
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  /** Called by the super-admin Platform Config page when saving. */
  function applyAndPersist(settings: {
    dailyPayoutTime: string;
    manualDispatchFee: number;
    manualDispatchFeeType: string;
  }) {
    dailyPayoutTime.value      = settings.dailyPayoutTime      ?? dailyPayoutTime.value;
    manualDispatchFee.value    = settings.manualDispatchFee    ?? manualDispatchFee.value;
    manualDispatchFeeType.value = settings.manualDispatchFeeType ?? manualDispatchFeeType.value;
    persist();
  }

  /** Re-hydrate from localStorage — useful on tenant page mount as a safety net. */
  function hydrate() {
    const saved = readFromStorage();
    if (saved) {
      dailyPayoutTime.value       = saved.dailyPayoutTime      ?? dailyPayoutTime.value;
      manualDispatchFee.value     = saved.manualDispatchFee    ?? manualDispatchFee.value;
      manualDispatchFeeType.value = saved.manualDispatchFeeType ?? manualDispatchFeeType.value;
    }
  }

  function persist() {
    localStorage.setItem(LS_KEY, JSON.stringify({
      dailyPayoutTime:      dailyPayoutTime.value,
      manualDispatchFee:    manualDispatchFee.value,
      manualDispatchFeeType: manualDispatchFeeType.value,
    }));
  }

  // ── Listeners ──────────────────────────────────────────────────────────────
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === LS_KEY) {
        hydrate();
      }
    });
  }

  return {
    dailyPayoutTime,
    manualDispatchFee,
    manualDispatchFeeType,
    isPercentage,
    getFeeLabel,
    computeTotal,
    applyAndPersist,
    hydrate,
    persist,
  };
});
