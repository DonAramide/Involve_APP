<template>
  <div class="q-pa-md">
    <div class="text-h6 q-mb-md">Terminal Configuration Settings</div>
    
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Allowed Terminal Types</div>
        <div class="text-caption text-grey q-mb-md">
          Define the hardware terminal types (e.g., N3, N8, A920) that can be assigned to MPOS devices.
        </div>
        
        <q-list bordered separator class="rounded-borders q-mb-md" style="max-width: 400px">
          <q-item v-for="(type, index) in terminalTypes" :key="index">
            <q-item-section>
              <q-item-label>{{ type }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat round icon="delete" color="negative" size="sm" @click="removeType(index)" />
            </q-item-section>
          </q-item>
          <q-item v-if="terminalTypes.length === 0">
            <q-item-section class="text-grey text-italic">No types defined.</q-item-section>
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
import { ref, onMounted, watch } from 'vue'

const terminalTypes = ref([])
const newType = ref('')

const loadSettings = () => {
  const saved = localStorage.getItem('invify_terminal_types')
  if (saved) {
    terminalTypes.value = JSON.parse(saved)
  } else {
    terminalTypes.value = ['N3', 'N8']
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

const removeType = (index) => {
  terminalTypes.value.splice(index, 1)
  saveSettings()
}

onMounted(() => {
  loadSettings()
})
</script>
