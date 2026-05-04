<!-- src/components/modals/WelcomeBackModal.vue -->
<template>
  <q-dialog v-model="internalModel" backdrop-filter="blur(10px)">
    <q-card class="bg-blue-grey-10 text-white shadow-24 border-indigo-accent overflow-hidden" style="width: 450px;">
      <q-card-section class="q-pa-xl text-center">
        <q-avatar size="100px" icon="waving_hand" color="indigo-7" text-color="white" class="q-mb-lg shadow-10" />
        <div class="text-h4 text-weight-bolder letter-spacing-1">Welcome Back!</div>
        <div class="text-subtitle1 text-grey-4 q-mt-md">We missed you. Ready to generate some amazing lesson notes today?</div>
        
        <div class="q-mt-xl bg-dark q-pa-md rounded-borders border-grey">
          <div class="text-caption text-grey-6 uppercase text-weight-bold q-mb-xs">Your Streak Re-activation</div>
          <div class="text-body2">Start by generating your first note of the week to stay on curriculum schedule.</div>
        </div>

        <q-btn 
          color="indigo-7" 
          label="Let's Go!" 
          class="full-width q-py-md q-mt-xl text-weight-bolder glossy" 
          to="/admin/notes"
          v-close-popup
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue'])

const internalModel = ref(false)

watch(() => props.modelValue, (val) => {
  internalModel.value = val
})

watch(internalModel, (val) => {
  emit('update:modelValue', val)
})
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #0f172a; }
.border-indigo-accent { border-top: 5px solid #4f46e5; }
.border-grey { border: 1px solid #1e293b; }
.full-width { width: 100%; }
</style>
