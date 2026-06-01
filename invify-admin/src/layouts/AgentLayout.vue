<template>
  <q-layout view="hHh lpR fFf" class="bg-main text-main font-inter">
    <q-header elevated class="bg-panel-darker border-bottom flex items-center justify-between q-px-md" style="height: 50px;">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="support_agent" size="sm" color="amber-4" />
        <span class="text-operator-title text-weight-bold" style="letter-spacing: 1px;">AGENT PORTAL</span>
      </div>
      
      <div class="row items-center op-gap-12" v-if="agentInfo">
        <div class="text-metric-mono text-muted text-right" style="font-size: 10px;">
          <span>{{ agentInfo.name }}</span><br/>
          <span class="text-amber-4">[{{ agentInfo.agentCode }}]</span>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const agentInfo = ref(null)

onMounted(() => {
  const stored = localStorage.getItem('invify_agent_info')
  if (stored) {
    agentInfo.value = JSON.parse(stored)
  }
})

const logout = () => {
  localStorage.removeItem('invify_agent_token')
  localStorage.removeItem('invify_agent_info')
  agentInfo.value = null
  router.push('/agent/login')
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
