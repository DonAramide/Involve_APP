<template>
  <span
    class="fp-status-badge"
    :class="[`tone-${tone}`, { pulse: pulse && tone === 'healthy' }]"
    role="status"
    :aria-label="ariaLabel || label"
  >
    <span class="dot" aria-hidden="true" />
    <span class="label">{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
  label: { type: String, default: '' },
  pulse: { type: Boolean, default: false }
})

const normalized = computed(() => String(props.status || '').toUpperCase())

const tone = computed(() => {
  const s = normalized.value
  if (['HEALTHY', 'ACTIVE', 'SUCCESS', 'POSITIVE', 'ENABLED', 'PROTECTED'].includes(s)) return 'healthy'
  if (['WARNING', 'DEGRADED', 'PENDING', 'PROVISIONING'].includes(s)) return 'warning'
  if (['CRITICAL', 'FAILED', 'ERROR', 'OFFLINE', 'SUSPENDED', 'NEGATIVE'].includes(s)) return 'critical'
  if (['SYNCING', 'INFO', 'PROCESSING', 'ROTATING'].includes(s)) return 'syncing'
  return 'neutral'
})

const label = computed(() => {
  if (props.label) return props.label
  const s = normalized.value
  if (!s) return 'Unknown'
  return s.charAt(0) + s.slice(1).toLowerCase()
})

const ariaLabel = computed(() => `Status: ${label.value}`)
</script>

<style scoped>
.fp-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid transparent;
  line-height: 1.4;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 0 currentColor;
}
.tone-healthy {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.35);
}
.tone-warning {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
}
.tone-critical {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.4);
}
.tone-syncing {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.35);
}
.tone-neutral {
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.12);
  border-color: rgba(148, 163, 184, 0.28);
}
.pulse .dot {
  animation: fp-heartbeat 1.8s ease-out infinite;
}
@keyframes fp-heartbeat {
  0% { box-shadow: 0 0 0 0 rgba(110, 231, 183, 0.55); }
  70% { box-shadow: 0 0 0 8px rgba(110, 231, 183, 0); }
  100% { box-shadow: 0 0 0 0 rgba(110, 231, 183, 0); }
}
</style>
