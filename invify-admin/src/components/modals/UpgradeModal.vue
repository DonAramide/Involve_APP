<!-- src/components/modals/UpgradeModal.vue -->
<template>
  <q-dialog v-model="internalModel" persistent backdrop-filter="blur(15px)">
    <q-card class="bg-blue-grey-10 text-white shadow-24 border-indigo-glow overflow-hidden" style="width: 500px; max-width: 90vw;">
      <!-- Hero Banner -->
      <div class="bg-indigo-10 q-pa-xl text-center relative-position">
        <q-icon name="auto_awesome" color="cyan-4" size="64px" class="q-mb-md" />
        <div class="text-h4 text-weight-bolder letter-spacing-1">Power Up Your School</div>
        <div class="text-subtitle1 text-grey-4 q-mt-sm">You've reached your monthly AI Generation limit.</div>
      </div>

      <q-card-section class="q-pa-xl">
        <div class="text-h6 text-weight-bold q-mb-md">Why upgrade to a paid plan?</div>
        
        <q-list dark padding class="bg-dark rounded-borders border-grey">
          <q-item v-for="benefit in benefits" :key="benefit.title">
            <q-item-section avatar>
              <q-icon :name="benefit.icon" color="indigo-4" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">{{ benefit.title }}</q-item-label>
              <q-item-label caption class="text-grey-6">{{ benefit.desc }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <div class="q-mt-xl text-center">
          <div class="text-caption text-grey-6 q-mb-md italic">"Invify has saved our teachers over 20 hours a week on lesson planning."</div>
          
          <q-btn 
            color="indigo-7" 
            label="Compare Plans & Upgrade Now" 
            class="full-width q-py-md text-weight-bolder glossy" 
            size="lg" 
            to="/admin/billing"
            v-close-popup
          />
          <q-btn flat label="Maybe Later" color="grey-6" class="q-mt-md" v-close-popup />
        </div>
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

const benefits = [
  { title: 'Massive Quota Increase', icon: 'bolt', desc: 'Generate up to 200 or 1,000+ notes per month.' },
  { title: 'Priority AI Engine', icon: 'speed', desc: 'Get your lesson notes faster with our premium pipeline.' },
  { title: 'Full PDF Collaboration', icon: 'picture_as_pdf', desc: 'Seamlessly export and share professional notes with inspectors.' }
]
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #0f172a; }
.bg-indigo-10 { background: #1e1b4b; }
.border-indigo-glow { border: 1px solid #4f46e5; box-shadow: 0 0 20px rgba(79, 70, 229, 0.2); }
.border-grey { border: 1px solid #1e293b; }
.full-width { width: 100%; }
</style>
