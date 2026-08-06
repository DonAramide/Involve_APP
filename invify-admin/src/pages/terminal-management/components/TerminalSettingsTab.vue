<template>
  <div class="q-pa-md">
    <div class="text-h6 q-mb-md">Terminal Configuration Settings</div>
    
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Allowed Terminal Types</div>
        <div class="text-caption text-grey q-mb-md">
          Define the hardware terminal types (e.g., N3, N8, A920) that can be assigned to MPOS devices.
        </div>

        <q-input
          v-model="typeSearch"
          dense
          outlined
          clearable
          debounce="150"
          placeholder="Search terminal types..."
          class="q-mb-md"
          style="max-width: 400px"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        
        <q-list bordered separator class="rounded-borders q-mb-md" style="max-width: 400px">
          <q-item v-for="(type, index) in filteredTerminalTypes" :key="`${type}-${index}`">
            <q-item-section>
              <q-item-label>{{ type }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat round icon="delete" color="negative" size="sm" @click="removeTypeByValue(type)" />
            </q-item-section>
          </q-item>
          <q-item v-if="filteredTerminalTypes.length === 0">
            <q-item-section class="text-grey text-italic">
              {{ terminalTypes.length === 0 ? 'No types defined.' : 'No types match your search.' }}
            </q-item-section>
          </q-item>
        </q-list>

        <div class="row q-gutter-sm items-center" style="max-width: 400px">
          <q-input v-model="newType" dense outlined placeholder="Enter new type (e.g. A920)" class="col-grow" @keyup.enter="addType" />
          <q-btn color="primary" label="Add" @click="addType" :disable="!newType.trim()" />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const terminalTypes = ref([])
const newType = ref('')
const typeSearch = ref('')

const filteredTerminalTypes = computed(() => {
  const needle = typeSearch.value.trim().toLowerCase()
  if (!needle) return terminalTypes.value
  return terminalTypes.value.filter(t => String(t).toLowerCase().includes(needle))
})

const loadSettings = () => {
  const saved = localStorage.getItem('invify_terminal_types')
  if (saved) {
    terminalTypes.value = JSON.parse(saved)
  } else {
    terminalTypes.value = ['AISINO_VM30', 'MOREFUN_MP63', 'N3', 'N8']
    saveSettings()
  }
}

const saveSettings = () => {
  localStorage.setItem('invify_terminal_types', JSON.stringify(terminalTypes.value))
}

const addType = () => {
  const t = newType.value.trim().toUpperCase()
  if (t && !terminalTypes.value.includes(t)) {
    terminalTypes.value.push(t)
    saveSettings()
    newType.value = ''
  }
}

const removeTypeByValue = (type) => {
  const index = terminalTypes.value.indexOf(type)
  if (index === -1) return
  terminalTypes.value.splice(index, 1)
  saveSettings()
}

onMounted(() => {
  loadSettings()
})
</script>
