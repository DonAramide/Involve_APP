<!-- invify-admin/src/pages/CurriculumPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-weight-bolder q-ma-none text-white letter-spacing-1">Master Curriculum</h1>
        <div class="text-grey-6">Standardized education topics powering AI-generated lesson notes.</div>
      </div>
      <div class="col-auto">
        <q-btn 
          color="indigo-7" 
          icon="add_task" 
          label="Define Topic" 
          class="q-px-md glossy" 
          @click="openModal()" 
        />
      </div>
    </div>

    <!-- Filter Context -->
    <q-card class="bg-blue-grey-10 q-mb-lg shadow-2 border-indigo">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-md-3">
          <q-input v-model="filters.subject" label="Filter Subject" dark filled dense>
            <template v-slot:append><q-icon name="menu_book" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="filters.class_level"
            :options="classOptions"
            label="Class Level"
            dark filled dense emit-value map-options
            @update:model-value="fetchCurriculum"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-select
            v-model="filters.term"
            :options="termOptions"
            label="Term"
            dark filled dense emit-value map-options
            @update:model-value="fetchCurriculum"
          />
        </div>
        <q-space />
        <q-btn flat class="col-auto text-grey-6" icon="refresh" @click="fetchCurriculum" />
      </q-card-section>
    </q-card>

    <!-- Main Table -->
    <q-table
      :rows="filteredRows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat bordered dark
      class="bg-blue-grey-10 shadow-2 rounded-borders"
      :pagination="{ rowsPerPage: 15 }"
    >
      <!-- Expandable Row for Subtopics -->
      <template v-slot:header="props">
        <q-tr :props="props">
          <q-th auto-width />
          <q-th v-for="col in props.cols" :key="col.name" :props="props">{{ col.label }}</q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td auto-width>
            <q-btn 
              size="sm" color="indigo-4" round flat 
              :icon="props.expand ? 'expand_less' : 'expand_more'" 
              @click="props.expand = !props.expand" 
            />
          </q-td>
          <q-td v-for="col in props.cols" :key="col.name" :props="props">
             <template v-if="col.name === 'class_level'">
                <q-chip size="sm" color="blue-grey-8" text-color="white" dense>{{ props.row.class_level }}</q-chip>
             </template>
             <template v-else-if="col.name === 'actions'">
                <q-btn flat round dense color="indigo-3" icon="edit" @click="openModal(props.row)" />
                <q-btn flat round dense color="red-4" icon="delete" @click="confirmDelete(props.row)" />
             </template>
             <template v-else>
                {{ props.row[col.field] }}
             </template>
          </q-td>
        </q-tr>
        <!-- Expanded Subtopics Content -->
        <q-tr v-show="props.expand" :props="props">
          <q-td colspan="100%" class="bg-blue-grey-9 q-pa-md">
            <div class="row items-center q-mb-sm">
                <div class="text-overline text-indigo-3 q-mr-md">DETAILED SUBTOPICS</div>
                <q-separator dark horizontal class="col" />
            </div>
            <div class="row q-gutter-xs">
               <q-chip 
                v-for="(sub, i) in props.row.subtopics" 
                :key="i" 
                size="sm" 
                outline 
                color="cyan-4" 
                text-color="white"
               >
                 {{ sub }}
               </q-chip>
               <div v-if="!props.row.subtopics?.length" class="text-grey-6 italic q-pa-xs">No subtopics defined.</div>
            </div>
          </q-td>
        </q-tr>
      </template>
    </q-table>

    <!-- Definition Modal -->
    <q-dialog v-model="modalVisible" persistent backdrop-filter="blur(10px)">
      <q-card style="width: 550px; max-width: 90vw" class="bg-blue-grey-10 text-white border-indigo">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">{{ isEditing ? 'Refine Topic' : 'Define New Topic' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-md q-pt-md">
          <div class="row q-col-gutter-sm">
             <div class="col-8">
                <q-input v-model="form.subject" label="Subject Name" dark filled dense placeholder="e.g. Mathematics" />
             </div>
             <div class="col-4">
                <q-select v-model="form.term" :options="termOptions.slice(1)" label="Term" dark filled dense emit-value map-options />
             </div>
          </div>

          <div class="row q-col-gutter-sm">
             <div class="col-6">
                <q-select v-model="form.class_level" :options="classOptions.slice(1)" label="Class Level" dark filled dense emit-value map-options />
             </div>
             <div class="col-6">
                <q-input v-model="form.week" label="Week Number" dark filled dense type="number" prefix="Week " />
             </div>
          </div>

          <q-input v-model="form.topic" label="Primary Topic Statement" dark filled dense type="textarea" autogrow />

          <!-- Tag/Chip Input for Subtopics -->
          <div class="q-mt-md">
            <div class="text-caption text-grey-6 q-mb-xs">SUBTOPICS (Press Enter to add)</div>
            <q-select
              v-model="form.subtopics"
              use-input
              use-chips
              multiple
              hide-dropdown-icon
              input-debounce="0"
              new-value-mode="add-unique"
              dark filled dense
              color="indigo-4"
              placeholder="e.g. Simple Interest"
            >
              <template v-slot:selected-item="scope">
                <q-chip
                  removable
                  dense
                  @remove="scope.removeAtIndex(scope.index)"
                  :tabindex="scope.tabindex"
                  color="indigo-7"
                  text-color="white"
                >
                  {{ scope.opt }}
                </q-chip>
              </template>
            </q-select>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pb-md q-px-md">
          <q-btn flat label="Cancel" v-close-popup color="grey-6" />
          <q-btn 
            :label="isEditing ? 'Save Changes' : 'Add to Curriculum'" 
            color="indigo-7" 
            class="q-px-md glossy" 
            @click="saveTopic" 
            :loading="saving" 
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../api'

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const modalVisible = ref(false)
const isEditing = ref(false)

const filters = ref({ subject: '', class_level: 'all', term: 'all' })
const form = ref({ subject: '', class_level: '', term: '', week: 1, topic: '', subtopics: [] })

const classOptions = [
  { label: 'All Classes', value: 'all' },
  { label: 'Primary 1', value: 'Primary 1' }, { label: 'Primary 2', value: 'Primary 2' },
  { label: 'Primary 3', value: 'Primary 3' }, { label: 'Primary 4', value: 'Primary 4' },
  { label: 'Primary 5', value: 'Primary 5' }, { label: 'Primary 6', value: 'Primary 6' },
  { label: 'JSS 1', value: 'JSS 1' }, { label: 'JSS 2', value: 'JSS 2' }, { label: 'JSS 3', value: 'JSS 3' },
  { label: 'SSS 1', value: 'SSS 1' }, { label: 'SSS 2', value: 'SSS 2' }, { label: 'SSS 3', value: 'SSS 3' }
]

const termOptions = [
  { label: 'All Terms', value: 'all' },
  { label: 'First Term', value: 'First' },
  { label: 'Second Term', value: 'Second' },
  { label: 'Third Term', value: 'Third' }
]

const columns = [
  { name: 'subject', label: 'SUBJECT', field: 'subject', align: 'left', sortable: true },
  { name: 'class_level', label: 'CLASS', field: 'class_level', align: 'left', sortable: true },
  { name: 'term', label: 'TERM', field: 'term', align: 'left', sortable: true },
  { name: 'week', label: 'WEEK', field: 'week', format: val => `Week ${val}`, align: 'left', sortable: true },
  { name: 'topic', label: 'TOPIC', field: 'topic', align: 'left' },
  { name: 'actions', label: 'ACTIONS', field: 'id', align: 'right' }
]

const filteredRows = computed(() => {
  return rows.value.filter(r => {
    return r.subject.toLowerCase().includes(filters.value.subject.toLowerCase())
  })
})

const fetchCurriculum = async () => {
  loading.value = true
  try {
    const params = {}
    if (filters.value.class_level !== 'all') params.class_level = filters.value.class_level
    if (filters.value.term !== 'all') params.term = filters.value.term
    
    const { data } = await adminApi.getCurriculum(params)
    rows.value = data
  } finally {
    loading.value = false
  }
}

const openModal = (topic = null) => {
  if (topic) {
    isEditing.value = true
    form.value = { ...topic }
  } else {
    isEditing.value = false
    form.value = { subject: '', class_level: 'JSS 1', term: 'First', week: 1, topic: '', subtopics: [] }
  }
  modalVisible.value = true
}

const saveTopic = async () => {
  if (!form.value.subject || !form.value.topic) return
  saving.value = true
  try {
    if (isEditing.value) {
      await adminApi.updateTopic(form.value.id, form.value)
    } else {
      await adminApi.createTopic(form.value)
    }
    modalVisible.value = false
    fetchCurriculum()
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (topic) => {
  if (confirm(`Are you sure you want to delete this curriculum entry? (${topic.subject} - Week ${topic.week})`)) {
    try {
      await adminApi.deleteTopic(topic.id)
      fetchCurriculum()
    } catch (error) {}
  }
}

onMounted(() => {
  fetchCurriculum()
})
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #1c262b; }
.bg-blue-grey-9 { background: #263238; }
.border-indigo { border-left: 5px solid #3f51b5; }
.italic { font-style: italic; }
</style>
