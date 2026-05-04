<!-- invify-admin/src/pages/LessonNotePage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-weight-bolder q-ma-none text-white letter-spacing-1">AI Lesson Planner</h1>
        <div class="text-grey-6">Curriculum-aligned lesson note generation with NERDC standards.</div>
      </div>
    </div>

    <!-- Selection Sidebar & Workspace -->
    <div class="row q-col-gutter-lg">
      <!-- Controls -->
      <div class="col-12 col-md-4">
        <q-card class="bg-blue-grey-10 shadow-2 border-indigo">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">Target Curriculum</div>
            <div class="q-gutter-md">
              <q-select
                v-model="form.class_level"
                :options="classOptions"
                label="Class Level"
                dark filled dense emit-value map-options
              />
              <q-input v-model="form.subjectName" label="Subject Name" dark filled dense placeholder="e.g. Mathematics" />
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <q-select v-model="form.term" :options="termOptions" label="Term" dark filled dense emit-value map-options />
                </div>
                <div class="col-6">
                  <q-input v-model="form.week" label="Week" type="number" dark filled dense prefix="Wk " />
                </div>
              </div>
            </div>
          </q-card-section>

          <q-separator dark />

          <q-card-actions vertical class="q-pa-md">
            <q-btn 
              color="indigo-7" 
              icon="psychology" 
              label="Generate Note" 
              :loading="generating" 
              @click="generateNote(false)"
              class="glossy"
            />
            <q-btn 
              v-if="currentNote"
              flat 
              color="grey-6" 
              icon="refresh" 
              label="Regenerate (Force)" 
              @click="generateNote(true)"
              class="q-mt-sm"
              size="sm"
            />
          </q-card-actions>
        </q-card>

        <q-card v-if="currentNote" class="bg-blue-grey-10 q-mt-md shadow-2 border-indigo">
          <q-card-section class="row items-center">
             <div class="text-subtitle2 text-grey-6">Display Mode</div>
             <q-space />
             <q-btn-toggle
               v-model="viewMode"
               flat dense
               toggle-color="indigo-4"
               color="grey-8"
               :options="[
                 { label: 'Structured', value: 'json' },
                 { label: 'Markdown', value: 'md' }
               ]"
             />
          </q-card-section>
        </q-card>
      </div>

      <!-- Content Viewer -->
      <div class="col-12 col-md-8">
        <q-card v-if="generating" class="bg-blue-grey-10 shadow-2 flex flex-center" style="min-height: 400px">
           <div class="column items-center">
              <q-spinner-cube color="indigo-4" size="4em" />
              <div class="text-h6 q-mt-lg text-indigo-3 animate-pulse">Consulting AI Pedagogy Expert...</div>
              <div class="text-caption text-grey-6">Optimizing contents for NERDC compliance</div>
           </div>
        </q-card>

        <q-card v-else-if="currentNote" class="bg-blue-grey-10 shadow-2 border-indigo overflow-hidden">
          <q-card-section class="bg-indigo-10 q-py-md">
            <div class="row items-center">
               <div class="column">
                  <div class="text-h5 text-weight-bold letter-spacing-1">{{ form.subjectName }}</div>
                  <div class="text-caption text-indigo-2">{{ form.class_level }} | Term {{ form.term }} | Week {{ form.week }}</div>
               </div>
               <q-space />
               <q-btn flat round icon="download" color="white" />
            </div>
          </q-card-section>

          <q-card-section class="q-pa-lg scroll" style="max-height: 70vh">
            <!-- JSON STRUCTURED VIEW -->
            <div v-if="viewMode === 'json'" class="q-gutter-y-lg">
               <!-- Objectives -->
               <div>
                  <div class="text-subtitle1 text-weight-bolder text-indigo-3 section-header">OBECTIVES</div>
                  <ul class="q-mt-sm q-pl-md custom-list">
                    <li v-for="(obj, i) in currentNote.structured.objectives" :key="i" class="q-mb-xs">
                      {{ obj }}
                    </li>
                  </ul>
               </div>

               <!-- Materials -->
               <div>
                  <div class="text-subtitle1 text-weight-bolder text-indigo-3 section-header">INSTRUCTIONAL MATERIALS</div>
                  <div class="row q-gutter-xs q-mt-sm">
                    <q-chip v-for="(mat, i) in currentNote.structured.materials" :key="i" color="blue-grey-9" text-color="white" size="sm">
                      {{ mat }}
                    </q-chip>
                  </div>
               </div>

               <!-- Introduction -->
               <div>
                  <div class="text-subtitle1 text-weight-bolder text-indigo-3 section-header">INTRODUCTION</div>
                  <p class="q-mt-sm text-body1 text-grey-4 line-height-1-6">{{ currentNote.structured.introduction }}</p>
               </div>

               <!-- Presentation Steps -->
               <div>
                  <div class="text-subtitle1 text-weight-bolder text-indigo-3 section-header">STEP-BY-STEP PRESENTATION</div>
                  <div class="q-mt-md">
                    <div v-for="(step, i) in currentNote.structured.steps" :key="i" class="q-mb-md">
                        <div class="text-weight-bold text-indigo-2">Step {{ i+1 }}: {{ step.title || 'Introduction' }}</div>
                        <div class="text-body2 text-grey-5">{{ step.description || step }}</div>
                    </div>
                  </div>
               </div>

               <!-- Evaluation -->
               <div>
                  <div class="text-subtitle1 text-weight-bolder text-indigo-3 section-header">EVALUATION</div>
                  <div class="q-mt-sm">
                     <div v-for="(evalItem, i) in currentNote.structured.evaluation" :key="i" class="row no-wrap q-mb-sm">
                        <q-icon name="help_outline" color="indigo-4" class="q-mr-sm q-mt-xs" size="xs" />
                        <div>{{ evalItem }}</div>
                     </div>
                  </div>
               </div>

               <!-- Assignment -->
               <q-banner dense class="bg-blue-grey-9 text-white rounded-borders">
                  <template v-slot:avatar><q-icon name="assignment" color="indigo-3" /></template>
                  <div class="text-weight-bold">ASSIGNMENT:</div>
                  {{ currentNote.structured.assignment }}
               </q-banner>
            </div>

            <!-- MARKDOWN VIEW -->
            <div v-else class="markdown-body">
               <pre class="bg-blue-grey-9 q-pa-md rounded-borders text-caption text-grey-4 overflow-auto">{{ currentNote.markdown }}</pre>
            </div>
          </q-card-section>
        </q-card>

        <q-card v-else class="bg-blue-grey-10 shadow-2 flex flex-center" style="min-height: 400px">
           <div class="column items-center text-grey-8">
              <q-icon name="auto_awesome" size="4em" class="q-mb-md" />
              <div class="text-h6">Select a Curriculum Topic to Start</div>
              <div class="text-caption">The AI will use the standardized Master Curriculum for accurate generation.</div>
           </div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, inject } from 'vue'
import { aiApi } from '../api'
import { useUsage } from '../composables/useUsage'

const { isHardLimit, fetchUsage } = useUsage()
const triggerUpgradeModal = inject('triggerUpgradeModal')

const generating = ref(false)
const currentNote = ref(null)
const viewMode = ref('json')

const form = ref({
  subjectName: 'Mathematics',
  class_level: 'JSS 1',
  term: 'First',
  week: 1
})

const classOptions = [
  { label: 'Primary 1-6', group: true },
  { label: 'Primary 1', value: 'Primary 1' }, { label: 'Primary 6', value: 'Primary 6' },
  { label: 'Junior Secondary', group: true },
  { label: 'JSS 1', value: 'JSS 1' }, { label: 'JSS 2', value: 'JSS 2' }, { label: 'JSS 3', value: 'JSS 3' },
  { label: 'Senior Secondary', group: true },
  { label: 'SSS 1', value: 'SSS 1' }, { label: 'SSS 2', value: 'SSS 2' }, { label: 'SSS 3', value: 'SSS 3' }
]

const termOptions = [
  { label: 'First Term', value: 'First' },
  { label: 'Second Term', value: 'Second' },
  { label: 'Third Term', value: 'Third' }
]

const generateNote = async (refresh = false) => {
  // --- HARD LIMIT INTERCEPTION ---
  if (isHardLimit.value) {
    if (triggerUpgradeModal) triggerUpgradeModal()
    return
  }

  generating.value = true
  currentNote.value = null
  try {
    const payload = {
      className: form.value.class_level,
      subjectName: form.value.subjectName,
      term: form.value.term,
      week: parseInt(form.value.week)
    }
    
    const { data } = refresh 
      ? await aiApi.refreshLessonNote(payload)
      : await aiApi.generateLessonNote(payload)
      
    currentNote.value = data
    fetchUsage() // Update quota stats after generation
  } finally {
    generating.value = false
  }
}
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #1c262b; }
.bg-blue-grey-9 { background: #263238; }
.border-indigo { border-left: 5px solid #3f51b5; }
.section-header { border-bottom: 1px solid #3f51b5; padding-bottom: 4px; margin-bottom: 12px; }
.custom-list { list-style-type: square; color: #7986cb; }
.custom-list li { color: #b0bec5; }
.line-height-1-6 { line-height: 1.6; }
.animate-pulse { animation: pulse 2s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
</style>
