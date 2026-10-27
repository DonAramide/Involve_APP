<template>
  <router-view v-slot="{ Component, route }">
    <template v-if="Component">
      <Suspense timeout="0">
        <component :is="Component" :key="route.fullPath" />
        <template #fallback>
          <InvifyBootSplash />
        </template>
      </Suspense>
    </template>
    <InvifyBootSplash v-else />
  </router-view>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { Notify, useQuasar } from 'quasar'
import { api } from './api'
import { consumeIdleLogoutNotice, startIdleLogoutWatchdog } from './auth/idleLogout'
import { useOperatorPreferences } from './composables/useOperatorPreferences'
import InvifyBootSplash from './components/InvifyBootSplash.vue'

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
  stopIdleWatchdog = startIdleLogoutWatchdog({
    api,
    Notify,
    isBusy: () => Boolean($q.loading?.isActive),
  })
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
