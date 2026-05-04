<!-- src/components/retention/SmartNudgeCard.vue -->
<template>
  <q-card class="bg-indigo-10 text-white shadow-5 border-indigo overflow-hidden relative-position">
    <div class="q-pa-lg">
      <div class="row items-center q-mb-md">
        <q-icon name="auto_awesome" color="cyan-4" size="sm" class="q-mr-sm" />
        <div class="text-subtitle2 text-weight-bold uppercase letter-spacing-1">Smart Suggestion</div>
      </div>
      
      <div v-if="loading" class="row items-center q-gutter-sm">
        <q-spinner-dots color="indigo-4" size="md" />
        <div class="text-caption text-grey-5">Analyzing curriculum flow...</div>
      </div>
      
      <div v-else>
        <div class="text-h6 text-weight-bolder q-mb-xs">{{ suggestion || 'Generate your first note' }}</div>
        <div class="text-caption text-grey-5 q-mb-lg">Based on your school's recent activity and curriculum timeline.</div>
        
        <q-btn 
          color="cyan-6" 
          label="Take Action" 
          icon-right="chevron_right" 
          class="q-px-lg glossy" 
          to="/admin/notes" 
          size="sm"
        />
      </div>
    </div>
    
    <!-- Abstract Decoration -->
    <q-icon name="psychology" size="120px" class="absolute-bottom-right text-indigo-9 q-ma-none" style="opacity: 0.1; right: -20px; bottom: -20px;" />
  </q-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../../api'

const loading = ref(true)
const suggestion = ref('')

const fetchSuggestion = async () => {
  loading.value = true
  try {
    const { data } = await adminApi.getRetentionSuggestion()
    suggestion.value = data.suggestion
  } catch (error) {
    console.error('[SmartNudge] Error:', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchSuggestion)
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-indigo-10 { background: #1e1b4b; }
.border-indigo { border-left: 6px solid #4f46e5; }
</style>
