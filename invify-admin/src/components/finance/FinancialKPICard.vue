<template>
  <div class="financial-kpi-card">
    <div class="kpi-header">
      <h3 class="kpi-title">{{ title }}</h3>
      <i v-if="icon" :class="['kpi-icon', icon]"></i>
    </div>
    <div class="kpi-body">
      <MoneyDisplay v-if="isCurrency" :amount="value" :currency="currency" class="kpi-value" />
      <span v-else class="kpi-value">{{ value }}</span>
    </div>
    <div v-if="trend" class="kpi-footer">
      <span :class="['kpi-trend', trend.direction === 'up' ? 'trend-up' : 'trend-down']">
        <i :class="trend.direction === 'up' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
        {{ trend.value }}%
      </span>
      <span class="kpi-trend-label">{{ trend.label }}</span>
    </div>
  </div>
</template>

<script setup>
import MoneyDisplay from './MoneyDisplay.vue';

defineProps({
  title: String,
  value: [Number, String],
  isCurrency: { type: Boolean, default: false },
  currency: { type: String, default: 'USD' },
  icon: String,
  trend: Object // { direction: 'up' | 'down', value: number, label: string }
});
</script>

<style scoped>
.financial-kpi-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.kpi-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
}

.kpi-icon {
  color: #9ca3af;
  font-size: 16px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  /* Override money display specifically for KPI sizes */
  :deep(.money-amount) { font-size: 28px; }
  :deep(.money-currency) { font-size: 16px; }
}

.kpi-footer {
  margin-top: 16px;
  font-size: 13px;
  display: flex;
  align-items: center;
}

.kpi-trend {
  display: flex;
  align-items: center;
  font-weight: 600;
  margin-right: 8px;
}

.kpi-trend i {
  margin-right: 4px;
  font-size: 10px;
}

.trend-up { color: #10b981; }
.trend-down { color: #ef4444; }

.kpi-trend-label {
  color: #6b7280;
}
</style>
