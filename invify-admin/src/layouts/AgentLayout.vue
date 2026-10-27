<template>
  <q-layout view="hHh lpR fFf" class="bg-main text-main font-inter">
    <q-header elevated class="bg-panel-darker border-bottom flex items-center justify-between q-px-md" style="height: 50px;">
      <div
        class="row items-center op-gap-8 no-wrap portal-home"
        role="button"
        tabindex="0"
        aria-label="Back to dashboard"
        @click="goDashboard"
        @keyup.enter="goDashboard"
      >
        <q-avatar size="28px" class="bg-panel rounded-borders" v-if="logoUrl">
          <img :src="logoUrl" alt="Logo" style="object-fit: contain;" />
        </q-avatar>
        <q-icon v-else :name="categoryIcon" size="sm" :color="categoryColor" />
        <div class="column justify-center">
          <div class="row items-center op-gap-6 no-wrap">
            <span class="text-operator-title text-weight-bold" style="letter-spacing: 1px;">
              {{ portalTitle }}
            </span>
            <q-badge :color="badgeColor" :text-color="badgeTextColor" class="q-ml-xs">{{ categoryBadge }}</q-badge>
          </div>
        </div>
      </div>
      
      <div class="row items-center op-gap-12" v-if="agentInfo">
        <div class="text-metric-mono text-muted text-right" style="font-size: 10px;">
          <span class="text-weight-bold text-main">{{ displayName }}</span><br/>
          <span :class="categoryColor">[{{ displayAgentCode }}]</span>
          <span v-if="agentInfo.email"><br/>{{ agentInfo.email }}</span>
        </div>
        <q-btn flat round size="sm" icon="logout" color="grey-5" @click="logout" />
      </div>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { pickInstituteCode } from '../utils/instituteIdentity'

const router = useRouter()
const route = useRoute()
const agentInfo = ref(null)
const displayAgentCode = computed(() =>
  pickInstituteCode(agentInfo.value?.agent_code, agentInfo.value?.agentCode),
)

const institutionType = computed(() => {
  const t = String(
    agentInfo.value?.institution_type ||
    agentInfo.value?.institutionType ||
    agentInfo.value?.regulatory_metadata?.institution_type ||
    (String(displayAgentCode.value || '').toUpperCase().startsWith('MHMO') ? 'HMO' : 'SCHOOL')
  ).toUpperCase()
  return t
})

const isHmo = computed(() => institutionType.value === 'HMO')

const logoUrl = computed(() => agentInfo.value?.logo_url || agentInfo.value?.logoUrl || '')

const displayName = computed(() => {
  return agentInfo.value?.trading_name || agentInfo.value?.tradingName || agentInfo.value?.name || 'Institute'
})

const portalTitle = computed(() => {
  switch (institutionType.value) {
    case 'HMO': return 'HMO INSTITUTION PORTAL'
    case 'BANK': return 'BANKING PORTAL'
    case 'PTSP': return 'PTSP TERMINAL PORTAL'
    case 'MERCHANT': return 'MERCHANT PORTAL'
    case 'CORPORATE': return 'CORPORATE PORTAL'
    case 'SCHOOL':
    default:
      return 'INSTITUTE PORTAL'
  }
})

const categoryBadge = computed(() => institutionType.value)

const categoryIcon = computed(() => {
  switch (institutionType.value) {
    case 'HMO': return 'health_and_safety'
    case 'BANK': return 'account_balance'
    case 'PTSP': return 'point_of_sale'
    case 'MERCHANT': return 'storefront'
    case 'CORPORATE': return 'corporate_fare'
    case 'SCHOOL':
    default:
      return 'school'
  }
})

const categoryColor = computed(() => {
  switch (institutionType.value) {
    case 'HMO': return 'teal-3'
    case 'BANK': return 'amber-4'
    case 'PTSP': return 'purple-3'
    case 'MERCHANT': return 'orange-4'
    case 'CORPORATE': return 'indigo-3'
    case 'SCHOOL':
    default:
      return 'cyan-3'
  }
})

const badgeColor = computed(() => {
  switch (institutionType.value) {
    case 'HMO': return 'teal-9'
    case 'BANK': return 'amber-9'
    case 'PTSP': return 'purple-9'
    case 'MERCHANT': return 'orange-9'
    case 'CORPORATE': return 'indigo-9'
    case 'SCHOOL':
    default:
      return 'cyan-9'
  }
})

const badgeTextColor = computed(() => {
  switch (institutionType.value) {
    case 'HMO': return 'teal-2'
    case 'BANK': return 'amber-2'
    case 'PTSP': return 'purple-2'
    case 'MERCHANT': return 'orange-2'
    case 'CORPORATE': return 'indigo-2'
    case 'SCHOOL':
    default:
      return 'cyan-2'
  }
})

const BANK_ONLY_ROUTES = [
  '/institute/leads',
  '/institute/portfolio',
  '/institute/wallet',
  '/institute/reputation',
  '/institute/certifications',
  '/institute/training',
  '/institute/assign-device',
  '/institute/assign-terminal',
  '/institute/hmo',
]

function enforceInstitutionRouteIsolation(path) {
  if (isHmo.value && BANK_ONLY_ROUTES.some((r) => String(path || '').toLowerCase().startsWith(r))) {
    router.replace('/institute/dashboard')
  }
}

function syncAgentInfo(ev) {
  if (ev?.detail) {
    agentInfo.value = ev.detail
    enforceInstitutionRouteIsolation(route.path)
    return
  }
  try {
    const stored = localStorage.getItem('invify_agent_info')
    if (stored) {
      agentInfo.value = JSON.parse(stored)
      enforceInstitutionRouteIsolation(route.path)
    }
  } catch {}
}

watch(() => route.path, (newPath) => {
  enforceInstitutionRouteIsolation(newPath)
})

onMounted(() => {
  syncAgentInfo()
  window.addEventListener('invify-agent-info-updated', syncAgentInfo)
})

onUnmounted(() => {
  window.removeEventListener('invify-agent-info-updated', syncAgentInfo)
})

function goDashboard() {
  if (route.path === '/institute/dashboard') {
    window.location.assign('/institute/dashboard')
    return
  }
  router.push('/institute/dashboard')
}

const logout = () => {
  localStorage.removeItem('invify_agent_token')
  localStorage.removeItem('invify_agent_info')
  agentInfo.value = null
  router.push('/institute/login')
}
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
.portal-home { cursor: pointer; }
</style>
