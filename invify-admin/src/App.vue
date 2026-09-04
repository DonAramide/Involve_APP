<template>
  <router-view />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { Notify, useQuasar } from 'quasar'
import { watch } from 'vue'
import { api } from './api'
import { consumeIdleLogoutNotice, startIdleLogoutWatchdog } from './auth/idleLogout'
import { useOperatorPreferences } from './composables/useOperatorPreferences'

const $q = useQuasar()
const { prefs } = useOperatorPreferences()

let stopIdleWatchdog = null

onMounted(() => {
  if (consumeIdleLogoutNotice()) {
    Notify.create({
      type: 'warning',
      icon: 'timer_off',
      message: 'You were logged out after 6 minutes of inactivity. Please sign in again.',
      position: 'top',
      timeout: 6000,
    })
  }
  stopIdleWatchdog = startIdleLogoutWatchdog({ api, Notify })
})

onUnmounted(() => {
  if (stopIdleWatchdog) stopIdleWatchdog()
})

// Autorun root-level theme synchronization to guarantee consistent styles on all pages
watch(() => prefs.value.isDarkMode, (isDark) => {
  $q.dark.set(isDark)
  if (isDark) {
    document.body.classList.add('theme-dark')
    document.body.classList.remove('theme-light')
  } else {
    document.body.classList.add('theme-light')
    document.body.classList.remove('theme-dark')
  }
}, { immediate: true })
</script>
