<template>
  <span :class="['financial-badge', colorClass]">
    <i v-if="icon" :class="['financial-badge-icon', icon]"></i>
    {{ formattedStatus }}
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    required: true
  }
});

const statusMap = {
  CREATED: { color: 'badge-gray', label: 'Created', icon: 'fas fa-file' },
  PENDING: { color: 'badge-yellow', label: 'Pending', icon: 'fas fa-clock' },
  PROCESSING: { color: 'badge-blue', label: 'Processing', icon: 'fas fa-spinner fa-spin' },
  SUCCEEDED: { color: 'badge-green', label: 'Succeeded', icon: 'fas fa-check-circle' },
  FAILED: { color: 'badge-red', label: 'Failed', icon: 'fas fa-exclamation-circle' },
  REFUNDED: { color: 'badge-purple', label: 'Refunded', icon: 'fas fa-undo' },
};

const config = computed(() => statusMap[props.status.toUpperCase()] || { color: 'badge-gray', label: props.status, icon: '' });

const colorClass = computed(() => config.value.color);
const formattedStatus = computed(() => config.value.label);
const icon = computed(() => config.value.icon);
</script>

<style scoped>
.financial-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.financial-badge-icon {
  margin-right: 6px;
}
.badge-gray { background: #f3f4f6; color: #4b5563; }
.badge-yellow { background: #fef3c7; color: #92400e; }
.badge-blue { background: #dbeafe; color: #1e40af; }
.badge-green { background: #d1fae5; color: #065f46; }
.badge-red { background: #fee2e2; color: #b91c1c; }
.badge-purple { background: #ede9fe; color: #5b21b6; }
</style>
