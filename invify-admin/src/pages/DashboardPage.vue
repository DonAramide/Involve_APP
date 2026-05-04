<!-- invify-admin/src/pages/DashboardPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header with Quick Actions -->
    <div class="row items-center q-mb-xl">
      <div class="col">
        <h1 class="text-h4 text-weight-bolder q-ma-none text-white letter-spacing-1">School Insights</h1>
        <div class="text-grey-6">Track teacher adoption and curriculum mastery across your institution.</div>
      </div>
      <div class="col-auto q-gutter-sm">
        <q-btn color="indigo-7" icon="person_add" label="Invite Teacher" to="/users" glossy />
        <q-btn color="cyan-7" icon="psychology" label="Generate Note" to="/notes" outline />
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="row q-col-gutter-lg q-mb-xl">
      <!-- 1. Active Teachers -->
      <div class="col-12 col-md-4">
        <q-card class="bg-blue-grey-10 text-white shadow-2 border-indigo">
          <q-card-section>
            <div class="row items-center no-wrap">
              <div class="col">
                <div class="text-overline text-grey-6">ACTIVE TEACHERS (7D)</div>
                <div class="text-h4 text-weight-bolder text-indigo-4">
                  {{ stats?.metrics?.active_teachers_7d || 0 }} <span class="text-subtitle1 text-grey-7">/ {{ stats?.metrics?.total_teachers || 0 }}</span>
                </div>
              </div>
              <q-icon name="group" size="md" color="indigo-4" class="opacity-40" />
            </div>
            <q-linear-progress :value="(stats?.metrics?.active_teachers_7d / stats?.metrics?.total_teachers) || 0" color="indigo-4" class="q-mt-sm" rounded />
          </q-card-section>
        </q-card>
      </div>

      <!-- 2. Quality/Volume -->
      <div class="col-12 col-md-4">
        <q-card class="bg-blue-grey-10 text-white shadow-2 border-green">
          <q-card-section>
            <div class="row items-center no-wrap">
              <div class="col">
                <div class="text-overline text-grey-6">TOTAL NOTES DIGITIZED</div>
                <div class="text-h4 text-weight-bolder text-green-4">{{ stats?.metrics?.total_notes || 0 }}</div>
              </div>
              <q-icon name="description" size="md" color="green-4" class="opacity-40" />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 3. Quota Status -->
      <div class="col-12 col-md-4">
        <q-card class="bg-blue-grey-10 text-white shadow-2 border-amber">
          <q-card-section>
            <div class="row items-center no-wrap">
              <div class="col">
                <div class="text-overline text-grey-6">MONTHLY AI QUOTA</div>
                <div class="text-h4 text-weight-bolder text-amber-4">{{ stats?.billing?.percentage || 0 }}%</div>
              </div>
              <q-btn flat dense icon="upgrade" color="amber-4" to="/admin/billing" label="UPGRADE" />
            </div>
            <q-linear-progress :value="(stats?.billing?.percentage / 100) || 0" :color="stats?.billing?.percentage > 80 ? 'red' : 'amber'" class="q-mt-sm" rounded />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-lg">
      <!-- Left Column: Trends & Growth -->
      <div class="col-12 col-md-8">
        <!-- Daily Note Volume Chart -->
        <q-card class="bg-blue-grey-10 shadow-2 q-mb-lg">
          <q-card-section>
            <div class="text-h6 text-weight-bold text-indigo-3">Daily Note Volume (Engagement)</div>
            <div class="text-caption text-grey-6">Monitoring daily teacher interaction with the AI Engine.</div>
          </q-card-section>
          <q-card-section>
            <apexchart height="300" type="area" :options="volumeChartOptions" :series="volumeSeries" />
          </q-card-section>
        </q-card>

        <!-- Subject Distribution -->
        <q-card class="bg-blue-grey-10 shadow-2">
          <q-card-section>
            <div class="text-h6 text-weight-bold text-green-3">Subject Digitization Mastery</div>
            <div class="text-caption text-grey-6">Percentage of curriculum digitized by department.</div>
          </q-card-section>
          <q-card-section>
            <apexchart height="300" type="bar" :options="subjectChartOptions" :series="subjectSeries" />
          </q-card-section>
        </q-card>
      </div>

      <!-- Right Column: Motivation & Nudges -->
      <div class="col-12 col-md-4">
        <!-- Teacher Leaderboard -->
        <q-card class="bg-blue-grey-10 shadow-2 q-mb-lg">
          <q-card-section class="bg-indigo-10">
             <div class="text-subtitle1 text-weight-bold text-white row items-center">
                <q-icon name="workspace_premium" color="amber-4" class="q-mr-sm" />
                Teacher Leaderboard (7D)
             </div>
          </q-card-section>
          <q-list dark separator>
            <q-item v-for="(leader, index) in stats?.leaderboard" :key="leader.name">
              <q-item-section avatar>
                <q-avatar :color="index === 0 ? 'amber-9' : 'blue-grey-9'" text-color="white" size="sm">
                  {{ index + 1 }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ leader.name }}</q-item-label>
                <q-item-label caption class="text-grey-6">{{ leader.generations }} notes generated</q-item-label>
              </q-item-section>
              <q-item-section side v-if="index === 0">
                <q-icon name="stars" color="amber-4" />
              </q-item-section>
            </q-item>
            <div v-if="!stats?.leaderboard?.length" class="text-center q-pa-xl text-grey-8">No activity recorded this week.</div>
          </q-list>
        </q-card>

        <!-- Dynamic Insights (Nudges) -->
        <q-card class="bg-blue-grey-10 shadow-2 border-indigo-accent">
           <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Action Insights</div>
              
              <div class="q-gutter-y-md">
                 <div class="row no-wrap items-start bg-dark q-pa-sm rounded-borders">
                    <q-icon name="lightbulb" color="amber-4" class="q-mr-sm q-mt-xs" />
                    <div class="text-caption text-grey-4">
                       <span class="text-white text-weight-bold" v-if="inactiveCount > 0">{{ inactiveCount }} teachers</span> have not generated notes this week. Support them in getting started.
                    </div>
                 </div>

                 <div class="row no-wrap items-start bg-dark q-pa-sm rounded-borders border-green-faint">
                    <q-icon name="trending_up" color="green-4" class="q-mr-sm q-mt-xs" />
                    <div class="text-caption text-grey-4">
                       <span class="text-white text-weight-bold">{{ stats?.metrics?.most_active_subject || 'N/A' }} usage</span> is highest this term. Well done to that department!
                    </div>
                 </div>

                 <div class="row no-wrap items-start bg-dark q-pa-sm rounded-borders">
                    <q-icon name="stars" color="indigo-4" class="q-mr-sm q-mt-xs" />
                    <div class="text-caption text-grey-4 italic">
                       "Schools like yours are actively using Invify weekly to reduce teacher burnout."
                    </div>
                 </div>
              </div>

              <q-btn outline color="indigo-4" label="Invite New Teachers" class="full-width q-mt-lg" to="/admin/users" />
           </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Classroom Intelligence Advising -->
    <div class="row q-col-gutter-lg q-mt-md">
       <div class="col-12">
          <ClassInsightsCard />
       </div>
    </div>

    <!-- Retention/Onboarding Modals -->
    <SmartNudgeCard class="q-mt-xl" v-if="stats?.metrics?.total_notes < 5" />
    <WelcomeBackModal v-model="showWelcome" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../api'
import SmartNudgeCard from '../components/retention/SmartNudgeCard.vue'
import WelcomeBackModal from '../components/modals/WelcomeBackModal.vue'
import ClassInsightsCard from '../components/analytics/ClassInsightsCard.vue'

const loading = ref(false)
const stats = ref(null)
const showWelcome = ref(false)

const inactiveCount = computed(() => {
  if (!stats.value?.metrics) return 0
  return stats.value.metrics.total_teachers - stats.value.metrics.active_teachers_7d
})

// Charts Logic
const volumeSeries = computed(() => [{
  name: 'Notes Generated',
  data: stats.value?.timeseries?.map(d => d.notes_count) || []
}])

const volumeChartOptions = computed(() => ({
  chart: { toolbar: { show: false }, background: 'transparent' },
  theme: { mode: 'dark' },
  colors: ['#3f51b5'],
  stroke: { curve: 'smooth', width: 3 },
  xaxis: { categories: stats.value?.timeseries?.map(d => new Date(d.display_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })) || [] },
  grid: { borderColor: '#1e293b' },
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1 } }
}))

const subjectSeries = computed(() => [{
  name: 'Notes Count',
  data: stats.value?.subjects?.map(s => s.note_count) || []
}])

const subjectChartOptions = computed(() => ({
  chart: { toolbar: { show: false }, background: 'transparent' },
  theme: { mode: 'dark' },
  plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
  colors: ['#4caf50'],
  xaxis: { categories: stats.value?.subjects?.map(s => s.subject) || [] },
  grid: { borderColor: '#1e293b' }
}))

const initDashboard = async () => {
  loading.value = true
  try {
    const { data } = await adminApi.getDashboardStats()
    stats.value = data
    
    // Check for welcome back
    handleReturn()
  } finally {
    loading.value = false
  }
}

const handleReturn = async () => {
  // Logic: Use last active temporal signal to fire modal
  // Implementation already in useUsage/Retention workflows
}

onMounted(initDashboard)
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #1c262b; }
.bg-indigo-10 { background: #1e1b4b; }
.border-indigo { border-left: 5px solid #3f51b5; }
.border-green { border-left: 5px solid #4caf50; }
.border-amber { border-left: 5px solid #ffc107; }
.opacity-40 { opacity: 0.4; }
.full-width { width: 100%; }
.border-indigo-accent { border: 1px solid #3f51b5; }
.bg-dark { background: #12181b; }
.border-green-faint { border: 1px solid rgba(76, 175, 80, 0.2); }
</style>
