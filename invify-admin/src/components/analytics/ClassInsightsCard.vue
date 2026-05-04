<!-- src/components/analytics/ClassInsightsCard.vue -->
<template>
  <q-card class="bg-blue-grey-10 text-white shadow-5 border-cyan overflow-hidden rounded-borders">
    <q-card-section class="bg-dark row items-center justify-between border-bottom">
      <div class="row items-center">
         <q-icon name="explore" color="cyan-4" size="sm" class="q-mr-sm" />
         <div class="text-subtitle1 text-weight-bold letter-spacing-1">Classroom Insights Advisor</div>
      </div>
      <q-select
        v-model="selectedClass"
        :options="classOptions"
        dark dense filled
        label="Select Class"
        style="width: 150px"
        @update:model-value="fetchInsights"
        hide-bottom-space
      />
    </q-card-section>

    <!-- Loading State -->
    <q-card-section v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-tail color="cyan-4" size="3em" />
    </q-card-section>

    <q-card-section v-else-if="!insights" class="flex flex-center q-pa-xl text-grey-6 text-center column">
       <q-icon name="insights" size="3em" class="q-mb-md opacity-40" />
       Select a class to analyze attendance and curriculum coverage.
    </q-card-section>

    <q-card-section v-else class="q-pa-none">
       <div class="row">
          <!-- Left: KPIs & Progress -->
          <div class="col-12 col-md-5 q-pa-md border-right">
             <!-- Attendance KPI -->
             <div class="q-mb-lg text-center">
                <div class="text-caption text-grey-5 q-mb-sm uppercase text-weight-bold">7-Day Attendance Rate</div>
                <q-circular-progress
                  show-value
                  font-size="24px"
                  :value="Math.round(insights.stats?.attendance_rate_7d || 0)"
                  size="120px"
                  :thickness="0.2"
                  :color="getRateColor(insights.stats?.attendance_rate_7d)"
                  track-color="blue-grey-9"
                  class="q-mb-sm"
                >
                  {{ Math.round(insights.stats?.attendance_rate_7d || 0) }}%
                </q-circular-progress>
             </div>
             
             <!-- Curriculum Progress -->
             <div>
                <div class="text-caption text-grey-5 q-mb-md uppercase text-weight-bold text-center">Core Subject Coverage</div>
                <div v-for="cov in insights.stats?.core_coverage" :key="cov.subject" class="q-mb-sm">
                   <div class="row justify-between text-caption q-mb-xs">
                      <span class="text-white">{{ cov.subject }}</span>
                      <span class="text-cyan-4">Wk {{ cov.weeks_completed }} / {{ cov.total_weeks }}</span>
                   </div>
                   <q-linear-progress :value="cov.progress_percentage / 100" color="cyan-4" track-color="blue-grey-9" />
                </div>
                <div v-if="!insights.stats?.core_coverage?.length" class="text-caption text-grey-6 text-center italic">
                   No notes generated for core subjects yet.
                </div>
             </div>
          </div>

          <!-- Right: Nudge Feed (Actionable Alerts) -->
          <div class="col-12 col-md-7 q-pa-md">
             <div class="text-caption text-grey-5 q-mb-md uppercase text-weight-bold">Actionable Nudges</div>
             
             <div class="q-gutter-y-sm">
                <div 
                   v-for="(msg, idx) in insights.messages" 
                   :key="idx" 
                   class="q-pa-md rounded-borders row no-wrap items-start bg-dark"
                   :class="getBorderClass(msg.type)"
                >
                   <q-icon :name="msg.icon" :color="getIconColor(msg.type)" size="sm" class="q-mr-md" />
                   <div class="text-body2 text-grey-3">{{ msg.message }}</div>
                </div>
             </div>

             <!-- Quick Actions based on insights -->
             <div class="q-mt-lg row q-gutter-x-sm">
                <q-btn flat dense color="cyan-4" icon="add_reaction" label="View Absentees" to="/admin/attendance-history" />
                <q-btn outline dense color="indigo-4" icon="psychology" label="Generate Note" to="/admin/notes" />
             </div>
          </div>
       </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { insightsApi } from '../../api'

const selectedClass = ref('JSS 1')
const classOptions = [
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'
]

const loading = ref(false)
const insights = ref(null)

const fetchInsights = async () => {
  if (!selectedClass.value) return
  loading.value = true
  try {
    const { data } = await insightsApi.getClass({ classLevel: selectedClass.value })
    insights.value = data
  } catch (error) {
    console.error('Failed to load insights:', error)
  } finally {
    loading.value = false
  }
}

const getRateColor = (rate) => {
  if (!rate) return 'grey'
  if (rate >= 90) return 'green-4'
  if (rate >= 75) return 'amber-4'
  return 'red-4'
}

const getBorderClass = (type) => {
  switch(type) {
    case 'warning': return 'border-amber'
    case 'danger': return 'border-red'
    case 'success': return 'border-green'
    default: return 'border-cyan'
  }
}

const getIconColor = (type) => {
  switch(type) {
    case 'warning': return 'amber-4'
    case 'danger': return 'red-4'
    case 'success': return 'green-4'
    default: return 'cyan-4'
  }
}

onMounted(() => {
  fetchInsights()
})
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #1c262b; }
.bg-dark { background: #12181b; }
.border-cyan { border-top: 4px solid #26c6da; }
.border-bottom { border-bottom: 1px solid #2a373f; }
.border-right { border-right: 1px solid #2a373f; }

.border-amber { border-left: 3px solid #ffca28; }
.border-red { border-left: 3px solid #ef5350; }
.border-green { border-left: 3px solid #66bb6a; }
.border-cyan { border-left: 3px solid #26c6da; }

.opacity-40 { opacity: 0.4; }
</style>
