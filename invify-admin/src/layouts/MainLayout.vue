<!-- invify-admin/src/layouts/MainLayout.vue -->
<template>
  <q-layout view="lHh Lpr lFf" class="bg-dark text-white">
    <!-- Premium Header -->
    <q-header elevated class="bg-indigo-10 text-white glossy">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          class="q-mr-sm"
        />

        <q-toolbar-title class="text-weight-bolder letter-spacing-1">
          INVIFY <span class="text-cyan-4">ADMIN</span>
        </q-toolbar-title>

        <q-space />

        <div class="row items-center q-gutter-md">
          <q-btn flat round dense icon="notifications" class="text-cyan-2">
            <q-badge color="red" floating>3</q-badge>
          </q-btn>
          <q-btn flat round dense icon="search" />
          <q-avatar size="32px">
            <img src="https://cdn.quasar.dev/img/avatar.png">
          </q-avatar>
        </div>
      </q-toolbar>
    </q-header>

    <!-- Navigation Sidebar -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="bg-blue-grey-10 text-grey-3"
      :width="260"
    >
      <q-scroll-area class="fit">
        <div class="q-pa-md text-overline text-grey-6 q-mt-sm">GENERAL</div>
        <q-list padding>
          <EssentialLink v-for="link in generalLinks" :key="link.title" v-bind="link" />
        </q-list>

        <div class="q-pa-md text-overline text-grey-6">FINANCE</div>
        <q-list padding>
          <EssentialLink v-for="link in financeLinks" :key="link.title" v-bind="link" />
        </q-list>

        <div class="q-pa-md text-overline text-grey-6">EDUCATION & AI</div>
        <q-list padding>
          <EssentialLink v-for="link in educationLinks" :key="link.title" v-bind="link" />
        </q-list>

        <div class="q-pa-md text-overline text-grey-6">SYSTEM</div>
        <q-list padding>
          <EssentialLink v-for="link in systemLinks" :key="link.title" v-bind="link" />
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <!-- Main Content -->
    <q-page-container>
      <!-- Usage Warning Banner (70% Threshold) -->
      <q-banner v-if="isNearLimit" class="bg-amber-10 text-white q-py-sm">
        <template v-slot:avatar>
          <q-icon name="warning" color="white" />
        </template>
        Your school has used <strong>{{ usagePercent }}%</strong> of its monthly AI generation quota. 
        Upgrade your plan to avoid service interruption.
        <template v-slot:action>
          <q-btn flat color="white" label="Upgrade Now" to="/admin/billing" class="text-weight-bolder" />
        </template>
      </q-banner>

      <router-view v-slot="{ Component }">
        <transition
          appear
          enter-active-class="animated fadeIn"
          leave-active-class="animated fadeOut"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>

    <!-- Global Upgrade Modal -->
    <UpgradeModal v-model="showUpgrade" />
  </q-layout>
</template>

<script setup>
import { ref, watch, provide } from 'vue'
import { useUsage } from '../composables/useUsage'
import UpgradeModal from '../components/modals/UpgradeModal.vue'
import EssentialLink from '../components/EssentialLink.vue'

const { usagePercent, isNearLimit, needsUpgrade } = useUsage()
const leftDrawerOpen = ref(false)
const showUpgrade = ref(false)

// Provide the toggle function so child pages can trigger the modal
const triggerUpgradeModal = () => { showUpgrade.value = true }
provide('triggerUpgradeModal', triggerUpgradeModal)

// Auto-trigger modal when usage hits 100% hard limit
watch(needsUpgrade, (val) => {
  if (val) showUpgrade.value = true
})

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

// 11 Navigation Items grouped logically
const generalLinks = [
  { title: 'Dashboard', icon: 'dashboard', link: '/dashboard', color: 'cyan-4' },
  { title: 'Tenants', icon: 'business', link: '/tenants', color: 'indigo-3' },
  { title: 'Users', icon: 'people', link: '/users', color: 'indigo-3' }
]

const financeLinks = [
  { title: 'Ledger', icon: 'book', link: '/ledger', color: 'amber-4' },
  { title: 'Wallet', icon: 'account_balance_wallet', link: '/wallet', color: 'amber-4' },
  { title: 'Payments', icon: 'payments', link: '/payments', color: 'amber-4' },
  { title: 'Reconciliation', icon: 'sync_alt', link: '/reconciliation', color: 'amber-4' },
  { title: 'Billing', icon: 'receipt_long', link: '/billing', color: 'deep-orange-4' }
]

const educationLinks = [
  { title: 'Curriculum', icon: 'auto_stories', link: '/curriculum', color: 'green-4' },
  { title: 'Lesson Notes', icon: 'description', link: '/notes', color: 'green-4' },
  { title: 'AI Usage', icon: 'psychology', link: '/ai-usage', color: 'purple-5' }
]

const systemLinks = [
  { title: 'Settings', icon: 'settings', link: '/settings', color: 'grey-4' }
]
</script>

<style lang="scss">
.letter-spacing-1 {
  letter-spacing: 1px;
}

.bg-blue-grey-10 {
  background: #1c262b;
}

.animated {
  animation-duration: 0.3s;
}

/* Glassmorphism Sidebar effect */
.q-drawer {
  background: rgba(28, 38, 43, 0.95);
  backdrop-filter: blur(10px);
}

/* Premium Link Hover State */
.q-item--active {
  background: rgba(63, 81, 181, 0.15);
  border-left: 4px solid #5c6bc0;
}
</style>
