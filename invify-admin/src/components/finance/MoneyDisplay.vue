<template>
  <span class="money-display" :class="{ 'is-negative': isNegative }">
    <span class="money-currency">{{ currencySymbol }}</span>
    <span class="money-amount">{{ formattedAmount }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  amount: { // Amount in cents/smallest unit
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  }
});

const isNegative = computed(() => props.amount < 0);

const formatter = computed(() => {
  return new Intl.NumberFormat(navigator.language || 'en-US', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: 2
  });
});

const formattedParts = computed(() => {
  const parts = formatter.value.formatToParts(Math.abs(props.amount) / 100);
  const currencySymbol = parts.find(p => p.type === 'currency')?.value || '$';
  const amountStr = parts.filter(p => p.type !== 'currency').map(p => p.value).join('').trim();
  return { currencySymbol, amountStr };
});

const currencySymbol = computed(() => formattedParts.value.currencySymbol);
const formattedAmount = computed(() => (isNegative.value ? '-' : '') + formattedParts.value.amountStr);

</script>

<style scoped>
.money-display {
  display: inline-flex;
  align-items: baseline;
  font-family: 'Inter', -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
  color: #111827;
}

.money-currency {
  font-size: 0.85em;
  color: #6b7280;
  margin-right: 2px;
}

.money-amount {
  font-weight: 600;
}

.is-negative .money-amount,
.is-negative .money-currency {
  color: #ef4444;
}
</style>
