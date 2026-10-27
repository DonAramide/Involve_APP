<template>
  <div>
    <div v-for="(benefit, index) in modelValue" :key="index" class="row q-col-gutter-sm q-mb-sm items-start">
      <q-input v-model="benefit.category" class="col-12 col-sm-5" label="Benefit" :dark="isDark" outlined dense />
      <q-input v-model="benefit.limitNaira" class="col-6 col-sm-3" label="Coverage limit (NGN)" :dark="isDark" outlined dense />
      <q-input v-model="benefit.copayPercent" class="col-4 col-sm-3" label="Co-pay %" :dark="isDark" outlined dense />
      <div class="col-2 col-sm-1">
        <q-btn flat dense round color="grey-5" icon="close" :aria-label="`Remove benefit ${index + 1}`" @click="remove(index)" />
      </div>
    </div>
    <q-btn flat dense no-caps color="teal-3" icon="add" label="Add benefit" @click="add" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { emptyBenefit } from 'src/hmo/benefitDraft'

const isDark = computed(() => useQuasar().dark.isActive)

const props = defineProps({
  modelValue: { type: Array, required: true }
})
const emit = defineEmits(['update:modelValue'])

function add() {
  emit('update:modelValue', [...props.modelValue, emptyBenefit()])
}

function remove(index) {
  const next = props.modelValue.filter((_, item) => item !== index)
  emit('update:modelValue', next.length ? next : [emptyBenefit()])
}
</script>
