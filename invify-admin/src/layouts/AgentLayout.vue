<template>
  <q-layout view="hHh lpR fFf" class="bg-main text-main font-inter">
    <q-header elevated class="bg-panel-darker border-bottom flex items-center justify-between q-px-md" style="height: 50px;">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon :name="isHmo ? 'health_and_safety' : 'support_agent'" size="sm" :color="isHmo ? 'teal-3' : 'amber-4'" />
        <span class="text-operator-title text-weight-bold" style="letter-spacing: 1px;">
          {{ isHmo ? 'HMO INSTITUTION PORTAL' : 'INSTITUTE PORTAL' }}
        </span>
        <q-badge v-if="isHmo" color="teal-9" text-color="teal-2" class="q-ml-xs">HMO</q-badge>
      </div>
      
      <div class="row items-center op-gap-12" v-if="agentInfo">
        <div class="text-metric-mono text-muted text-right" style="font-size: 10px;">
          <span>{{ agentInfo.name }}</span><br/>
          <span :class="isHmo ? 'text-teal-3' : 'text-amber-4'">[{{ displayAgentCode }}]</span>
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

const isHmo = computed(() => {
  const t = String(
    agentInfo.value?.institution_type ||
    agentInfo.value?.institutionType ||
    (String(displayAgentCode.value || '').toUpperCase().startsWith('MHMO') ? 'HMO' : '')
  ).toUpperCase()
  return t === 'HMO'
})

const BANK_ONLY_ROUTES = [
  '/institute/leads',
  '/institute/portfolio',
  '/institute/wallet',
  '/institute/reputation',
  '/institute/certifications',
  '/institute/training',
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
</style>
