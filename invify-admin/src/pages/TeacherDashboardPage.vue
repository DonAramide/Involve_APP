<!-- invify-admin/src/pages/TeacherDashboardPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-weight-bolder q-ma-none text-white letter-spacing-1">Teacher Workspace</h1>
        <div class="text-grey-6">Streamlined pedagogical planning and repository management.</div>
      </div>
      <div class="col-auto">
        <q-btn 
          color="indigo-7" 
          icon="auto_awesome" 
          label="Quick Generate" 
          class="q-px-md glossy" 
          @click="showGenerator = true" 
        />
      </div>
    </div>

    <!-- Metrics Row -->
    <div class="row q-col-gutter-lg q-mb-xl">
      <div v-for="stat in dashboardStats" :key="stat.label" class="col-12 col-sm-4">
        <q-card class="bg-blue-grey-10 shadow-2 border-left-highlight" :style="{ borderLeftColor: stat.color }">
           <q-card-section class="row items-center">
              <div class="col">
                 <div class="text-overline text-grey-6">{{ stat.label }}</div>
                 <div class="text-h5 text-weight-bold">{{ stat.value }}</div>
              </div>
              <q-icon :name="stat.icon" size="md" color="grey-7" class="opacity-30" />
           </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Repository Tabs -->
    <div class="q-mb-lg">
      <q-tabs
        v-model="activeTab"
        dense active-color="indigo-4"
        indicator-color="indigo-4"
        align="left"
        narrow-indicator
        class="text-grey-6"
      >
        <q-tab name="personal" label="My Notes" icon="person" />
        <q-tab name="school" label="School Library" icon="business" />
        <q-tab name="global" label="Platform Shared" icon="public" />
      </q-tabs>
      <q-separator dark />
    </div>

    <!-- Repository Content -->
    <div class="row q-col-gutter-lg">
       <div v-if="loading" class="col-12 flex flex-center q-pa-xl">
          <q-spinner-dots color="indigo-4" size="3em" />
       </div>
       
       <template v-else-if="notes.length">
          <div v-for="note in notes" :key="note.id" class="col-12 col-md-4">
             <q-card class="bg-blue-grey-10 shadow-2 hover-lift cursor-pointer" @click="viewNote(note)">
                <q-card-section>
                   <div class="row items-center q-mb-sm">
                      <q-chip size="xs" :color="sourceColors[note.source]" text-color="white" dense class="text-weight-bold">
                        {{ note.source.toUpperCase() }}
                      </q-chip>
                      <q-space />
                      <div class="text-caption text-grey-6">{{ new Date(note.created_at).toLocaleDateString() }}</div>
                   </div>
                   <div class="text-subtitle1 text-weight-bold text-white q-mb-xs">{{ note.subject }}</div>
                   <div class="text-caption text-indigo-3">{{ note.class_level }} • Term {{ note.term }}</div>
                   <div class="text-caption text-grey-5 q-mt-sm ellipsis">{{ note.topic }}</div>
                </q-card-section>
                <q-card-actions align="right">
                   <q-btn flat round dense icon="visibility" color="indigo-3" />
                   <q-btn flat round dense icon="edit" color="indigo-3" @click.stop="editNote(note)" />
                </q-card-actions>
             </q-card>
          </div>
       </template>

       <div v-else class="col-12 flex flex-center q-pa-xl column text-grey-7">
          <q-icon name="folder_open" size="4em" />
          <div class="text-h6 q-mt-md">Your repository is empty</div>
          <q-btn outline label="Create your first note" color="indigo-4" class="q-mt-md q-px-md" @click="showGenerator = true" />
       </div>
    </div>

    <!-- Note Viewer / Editor Dialog -->
    <q-dialog v-model="viewerActive" backdrop-filter="blur(10px)">
      <q-card style="width: 800px; max-width: 95vw;" class="bg-blue-grey-10 text-white border-indigo">
        <q-card-section class="bg-indigo-10 row items-center q-pa-md">
          <div class="column">
             <div class="text-h6 text-weight-bold">{{ currentNote?.subject }}</div>
             <div class="text-caption text-indigo-2">{{ currentNote?.class_level }} | Term {{ currentNote?.term }} | Week {{ currentNote?.week }}</div>
          </div>
          <q-space />
          
          <div class="row q-gutter-xs">
            <q-btn flat round dense icon="download" color="white" @click="exportPdf" :loading="exporting">
               <q-tooltip>Export as professional PDF</q-tooltip>
            </q-btn>
            <q-btn 
              flat round dense 
              :icon="isEditing ? 'save' : 'edit'" 
              :color="isEditing ? 'green-4' : 'white'" 
              @click="isEditing ? saveChanges() : startEditing()" 
            >
               <q-tooltip>{{ isEditing ? 'Save as Personal Copy' : 'Personalize this note' }}</q-tooltip>
            </q-btn>
            <q-btn icon="close" flat round dense v-close-popup />
          </div>
        </q-card-section>

        <q-card-section class="q-pa-lg scroll" style="max-height: 75vh">
           <div v-if="!isEditing" class="q-gutter-y-lg">
              <div v-for="(content, key) in currentNote?.content.structured" :key="key">
                 <div class="text-subtitle1 text-weight-bolder text-indigo-3 text-uppercase letter-spacing-1 border-bottom-indigo q-mb-sm">
                   {{ key }}
                 </div>
                 <template v-if="Array.isArray(content)">
                    <ul class="q-pl-md text-grey-4">
                       <li v-for="(item, i) in content" :key="i" class="q-mb-xs">{{ item.description || item }}</li>
                    </ul>
                 </template>
                 <p v-else class="text-body1 text-grey-4">{{ content }}</p>
              </div>
           </div>
           
           <!-- Editor Mode (simplified for JSON structure) -->
           <div v-else class="q-gutter-md">
              <q-banner dense class="bg-indigo-9 text-caption text-white rounded-borders">
                <template v-slot:avatar><q-icon name="info" /></template>
                You are customizing this note. Saving will create a new personal copy in your repository.
              </q-banner>
              
              <div v-for="(content, key) in editorNote.content.structured" :key="key">
                <div class="text-overline text-indigo-3">{{ key.toUpperCase() }}</div>
                <q-input 
                  v-if="!Array.isArray(content)"
                  v-model="editorNote.content.structured[key]"
                  type="textarea" dark filled autogrow dense
                />
                <div v-else class="q-gutter-xs">
                   <q-input 
                     v-for="(item, i) in content" :key="i"
                     v-model="editorNote.content.structured[key][i]"
                     dark filled dense class="q-mb-xs"
                   >
                     <template v-slot:append>
                        <q-btn flat round dense icon="delete" size="xs" color="red-4" @click="removeItem(key, i)" />
                     </template>
                   </q-input>
                   <q-btn flat label="Add Point" icon="add" size="sm" color="indigo-3" @click="addItem(key)" />
                </div>
              </div>
           </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Quick Generation Sidebar -->
    <q-dialog v-model="showGenerator" position="right" backdrop-filter="blur(4px)">
       <q-card style="width: 350px; height: 100vh;" class="bg-blue-grey-10 text-white shadow-10">
          <q-card-section class="q-pa-lg">
             <div class="text-h6 text-weight-bold q-mb-md">Quick Generate</div>
             <div class="text-caption text-grey-6 q-mb-xl">Powered by AI and standardized Master Curriculum.</div>
             
             <div class="q-gutter-lg">
                <q-select v-model="genForm.class_level" :options="classOptions" label="Class Level" dark filled dense />
                <q-input v-model="genForm.subjectName" label="Subject Name" dark filled dense />
                <div class="row q-col-gutter-sm">
                   <div class="col-6"><q-select v-model="genForm.term" :options="termOptions" label="Term" dark filled dense /></div>
                   <div class="col-6"><q-input v-model="genForm.week" label="Week" type="number" dark filled dense /></div>
                </div>
                
                <q-btn 
                  color="indigo-7" 
                  icon="auto_awesome" 
                  label="Generate Lesson Note" 
                  class="full-width glossy q-py-md q-mt-xl" 
                  :loading="generating"
                  @click="triggerGeneration"
                />
             </div>
          </q-card-section>
       </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { adminApi, aiApi } from '../api'

const loading = ref(false)
const generating = ref(false)
const exporting = ref(false)
const showGenerator = ref(false)
const viewerActive = ref(false)
const isEditing = ref(false)
const activeTab = ref('personal')
const notes = ref([])
const currentNote = ref(null)
const editorNote = ref(null)

const sourceColors = { 'ai': 'indigo-7', 'edited': 'cyan-9', 'shared': 'orange-9' }
const classOptions = ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3']
const termOptions = ['First', 'Second', 'Third']

const genForm = ref({ class_level: 'JSS 1', subjectName: 'Mathematics', term: 'First', week: 1 })

const dashboardStats = ref([
  { label: 'MY PERSONAL NOTES', value: 0, color: '#3f51b5', icon: 'person' },
  { label: 'SCHOOL LIBRARY', value: 0, color: '#00bcd4', icon: 'business' },
  { label: 'PLATFORM TOPICS', value: 0, color: '#ff9800', icon: 'public' }
])

const fetchNotes = async () => {
  loading.value = true
  try {
    const { data } = await adminApi.listNotes({ scope: activeTab.value })
    notes.value = data
    
    // Update simple stats from the API counts 
    if (activeTab.value === 'personal') dashboardStats.value[0].value = data.length
    if (activeTab.value === 'school') dashboardStats.value[1].value = data.length
  } finally {
    loading.value = false
  }
}

watch(activeTab, fetchNotes)

const viewNote = (note) => {
  currentNote.value = note
  isEditing.value = false
  viewerActive.value = true
}

const startEditing = () => {
  editorNote.value = JSON.parse(JSON.stringify(currentNote.value))
  isEditing.value = true
}

const addItem = (key) => editorNote.value.content.structured[key].push('New point...')
const removeItem = (key, i) => editorNote.value.content.structured[key].splice(i, 1)

const saveChanges = async () => {
  try {
    const payload = {
      ...editorNote.value,
      source: 'edited'
    }
    await adminApi.saveNote(payload)
    isEditing.value = false
    viewerActive.value = false
    activeTab.value = 'personal'
    fetchNotes()
  } catch (error) {}
}

const exportPdf = async () => {
  exporting.value = true
  try {
    const response = await adminApi.exportNotePdf(currentNote.value.id)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Lesson_Note_${currentNote.value.subject}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    exporting.value = false
  }
}

const triggerGeneration = async () => {
  generating.value = true
  try {
    const { data } = await aiApi.generateLessonNote({
      ...genForm.value,
      week: parseInt(genForm.value.week)
    })
    showGenerator.value = false
    activeTab.value = 'personal'
    fetchNotes()
  } finally {
    generating.value = false
  }
}

onMounted(fetchNotes)
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #1c262b; }
.bg-blue-grey-9 { background: #263238; }
.border-left-highlight { border-left: 4px solid #fff; }
.opacity-30 { opacity: 0.3; }
.hover-lift:hover { transform: translateY(-4px); transition: transform 0.2s ease; }
.border-bottom-indigo { border-bottom: 2px solid #3f51b5; }
.bg-indigo-10 { background: #1a237e; }
.bg-indigo-9 { background: #283593; }
</style>
