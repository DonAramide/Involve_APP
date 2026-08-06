<template>
  <svg
    class="fp-sparkline"
    :viewBox="`0 0 ${width} ${height}`"
    preserveAspectRatio="none"
    role="img"
    :aria-label="ariaLabel"
  >
    <polyline
      fill="none"
      :stroke="stroke"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      :points="points"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  values: { type: Array, default: () => [] },
  width: { type: Number, default: 120 },
  height: { type: Number, default: 28 },
  stroke: { type: String, default: '#34d399' },
  ariaLabel: { type: String, default: 'Trend sparkline' }
})

const points = computed(() => {
  const vals = (props.values || []).map(Number).filter(v => Number.isFinite(v))
  if (!vals.length) {
    return `0,${props.height / 2} ${props.width},${props.height / 2}`
  }
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  return vals.map((v, i) => {
    const x = vals.length === 1 ? props.width / 2 : (i / (vals.length - 1)) * props.width
    const y = props.height - ((v - min) / span) * (props.height - 4) - 2
    return `${x},${y}`
  }).join(' ')
})
</script>

<style scoped>
.fp-sparkline {
  width: 100%;
  height: 28px;
  display: block;
  opacity: 0.9;
}
</style>
