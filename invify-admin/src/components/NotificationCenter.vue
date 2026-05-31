<!-- invify-admin/src/components/NotificationCenter.vue -->
<template>
  <q-drawer v-model="isOpen" side="right" overlay bordered class="bg-panel drawer-shadow bg-transparent" :width="0">
    <!-- The actual drawer widths are handled by the child components to allow independent sliding if desired, or we just render them absolutely. 
         Wait, rendering them absolutely inside a 0-width drawer might clip. Let's make this component just an invisible orchestrator, 
         and let the child components render their own q-drawers! 
         Wait, q-drawer inside a q-drawer doesn't work well. 
         Let's NOT use a q-drawer here. 
    -->
  </q-drawer>
  
  <NotificationDrawer 
    v-model="isListOpen" 
    @select-notification="onSelectNotification" 
  />

  <NotificationDetailDrawer 
    :notification="selectedNotification"
    @close="onCloseDetail"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import NotificationDrawer from './NotificationDrawer.vue'
import NotificationDetailDrawer from './NotificationDetailDrawer.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const isListOpen = ref(false)
const selectedNotification = ref(null)

// When parent sets this to true, open the list drawer
watch(() => props.modelValue, (val) => {
  if (val) {
    isListOpen.value = true
    selectedNotification.value = null
  } else {
    isListOpen.value = false
    selectedNotification.value = null
  }
})

// When list drawer closes, sync back to parent
watch(isListOpen, (val) => {
  if (!val && !selectedNotification.value) {
    emit('update:modelValue', false)
  }
})

const onSelectNotification = (notif) => {
  isListOpen.value = false
  selectedNotification.value = notif
}

const onCloseDetail = () => {
  selectedNotification.value = null
  isListOpen.value = true
}

const isOpen = computed(() => false) // dummy for the v-model on the hidden wrapper
</script>
