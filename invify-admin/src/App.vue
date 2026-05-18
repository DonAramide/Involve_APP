<template>
  <router-view />
</template>

<script setup>
import { useQuasar } from 'quasar'
import { watch } from 'vue'
import { useOperatorPreferences } from './composables/useOperatorPreferences'

const $q = useQuasar()
const { prefs } = useOperatorPreferences()

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
