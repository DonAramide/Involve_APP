<!-- invify-admin/src/components/contextual/OperationalKnowledgeDrawer.vue -->
<template>
  <q-drawer
    v-model="drawerOpen"
    side="right"
    overlay
    behavior="mobile"
    :width="440"
    elevated
    class="bg-panel border-left-blue text-main"
  >
    <div class="knowledge-drawer-wrapper column fit q-pa-lg">
      <!-- HEADER -->
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center op-gap-8">
          <q-icon name="psychology" size="md" color="cyan-4" />
          <span class="text-subtitle1 text-weight-bold tracking-wide">OPERATIONAL INTELLIGENCE BASE</span>
        </div>
        <q-btn flat round dense icon="close" @click="drawerOpen = false" />
      </div>

      <!-- SEARCH GLOSSARY SECTION -->
      <div class="column q-mb-md op-gap-8">
        <q-input
          v-model="searchQuery"
          dense
          filled
          placeholder="Search glossary: e.g. eBPF, TPM, Drift..."
          class="bg-subpanel text-main rounded-borders font-mono"
          clearable
          @update:model-value="executeSearch"
        >
          <template v-slot:prepend>
            <q-icon name="search" color="muted" />
          </template>
        </q-input>

        <!-- Ranked Search Results -->
        <div v-if="searchResults.length > 0" class="search-results-deck column op-gap-6 scroll q-mb-xs" style="max-height: 180px;">
          <div 
            v-for="r in searchResults" 
            :key="r.id"
            class="search-result-card bg-panel-dark border-main rounded-borders q-pa-sm cursor-pointer hover-border"
            @click="selectTarget(r)"
          >
            <div class="row items-center justify-between">
              <span class="text-metric-mono text-cyan-4 text-weight-bold" style="font-size: 11px;">{{ r.title }}</span>
              <span class="text-metric-sm text-muted text-uppercase" style="font-size: 9px;">{{ r.type }}</span>
            </div>
            <p class="text-caption text-secondary q-ma-none text-ellipsis" style="font-size: 10px;">{{ r.description }}</p>
          </div>
        </div>
      </div>

      <q-separator dark class="opacity-10 q-my-sm" />

      <!-- CONTENT BODY -->
      <div class="col scroll column op-gap-16">

        <!-- WALKTHROUGH CONTROLLER -->
        <div class="bg-subpanel border-main rounded-borders q-pa-md column op-gap-10">
          <div class="row items-center justify-between">
            <span class="text-operator-title text-metric-sm text-yellow-5">Workflow Narration Player</span>
            <span v-if="tourActive" class="text-metric-sm text-green-5 pulsing-text">ON-AIR</span>
          </div>

          <div v-if="!tourActive" class="column op-gap-4">
            <span class="text-caption text-secondary">Trigger a guided, self-documenting walk-through showing all telemetry and billing gates sequentially.</span>
            <q-btn 
              color="yellow-5" 
              text-color="black"
              label="Launch Workstation Onboarding" 
              class="text-weight-bold" 
              unelevated 
              dense
              icon="auto_awesome"
              @click="startWalkthrough"
            />
          </div>

          <div v-else class="column op-gap-8">
            <div class="row items-center justify-between text-metric-sm">
              <span class="text-muted">Active Concept:</span>
              <span class="text-metric-mono text-main">{{ activeHoverKey }}</span>
            </div>
            <div class="tour-progress-bar bg-panel rounded-borders overflow-hidden" style="height: 6px;">
              <div 
                class="bg-yellow-5 fit" 
                :style="{ width: `${((tourStep + 1) / tourSteps.length) * 100}%` }" 
              />
            </div>
            <div class="row items-center justify-between text-metric-sm">
              <span>Step {{ tourStep + 1 }} of {{ tourSteps.length }}</span>
              <div class="row op-gap-4">
                <q-btn flat dense icon="stop" color="red-5" label="Abort" @click="stopWalkthrough" size="xs" />
                <q-btn flat dense icon="play_arrow" color="green-5" label="Advance" @click="advanceWalkthrough" size="xs" />
              </div>
            </div>
          </div>
        </div>

        <!-- OPERATOR CERTIFICATION HUD -->
        <div class="bg-subpanel border-main rounded-borders q-pa-md column op-gap-10">
          <div class="text-operator-title text-metric-sm text-blue-5">Training Certification HUD</div>
          
          <div class="row items-center justify-between bg-panel-dark q-pa-sm border-main rounded-borders">
            <span class="text-muted">Active Badge Level:</span>
            <span class="text-metric-mono text-cyan-4 text-weight-bold">{{ certificationLevel }}</span>
          </div>

          <div class="row items-center justify-between text-metric-sm">
            <span>Systems Mastered: <span class="text-yellow-5">{{ conceptsMastered.length }}</span></span>
            <span>Explored Glossary: <span class="text-blue-5">{{ exploredKeys.length }} / 20</span></span>
          </div>

          <!-- Mastered Lists -->
          <div v-if="conceptsMastered.length > 0" class="column op-gap-4">
            <span class="text-metric-sm text-muted">Pinned Concept Deck:</span>
            <div class="row wrap op-gap-4">
              <span 
                v-for="k in conceptsMastered" 
                :key="k" 
                class="badge-pin-tag text-metric-mono text-secondary q-px-sm rounded-borders cursor-pointer"
                @click="loadTargetData(k)"
              >
                ★ {{ k }}
              </span>
            </div>
          </div>
        </div>

        <!-- DEPENDENCY TOPOLOGY CAUSALITY MAP -->
        <div v-if="conceptsMastered.length > 0" class="column op-gap-8">
          <div class="text-operator-title text-metric-sm text-muted">Causality & Dependency Graph</div>
          <div class="dependency-graph bg-panel-dark border-main rounded-borders q-pa-md column op-gap-12 relative-position">
            
            <div class="column items-center op-gap-4">
              <span class="text-metric-mono text-yellow-5" style="font-size: 10px;">PINNED ANCHOR</span>
              <div class="node-block active-node rounded-borders q-px-sm q-py-xs border-main text-metric-mono text-caption">
                {{ conceptsMastered[0] }}
              </div>
            </div>
            
            <!-- Connection Line Visualizations -->
            <div class="column items-center">
              <q-icon name="arrow_downward" color="cyan-4" size="sm" class="pulsing-icon" />
              <span class="text-metric-mono text-muted text-center" style="font-size: 9px; line-height: 1;">TRIP CAUSE</span>
            </div>

            <div class="row wrap justify-center op-gap-8">
              <div 
                v-for="dep in getPinnedDependencies()" 
                :key="dep"
                class="node-block dependent-node rounded-borders q-px-sm q-py-xs border-main text-metric-mono text-caption cursor-pointer"
                @click="loadTargetData(dep)"
              >
                {{ dep }}
              </div>
            </div>
            
          </div>
        </div>

        <!-- SELECTED GLOSSARY / DETAIL CARD DISPLAY -->
        <div v-if="activeSelectedDetail" class="selected-detail-card bg-panel-dark border-main rounded-borders q-pa-md column op-gap-8">
          <div class="row items-center justify-between border-bottom q-pb-xs">
            <span class="text-metric-mono text-cyan-4 text-weight-bold text-subtitle2">{{ activeSelectedDetail.title }}</span>
            <q-btn flat round dense icon="close" size="xs" color="muted" @click="activeSelectedDetail = null" />
          </div>
          <p class="text-body2 text-secondary q-ma-none" style="line-height: 1.5;">
            {{ activeSelectedDetail.description }}
          </p>
        </div>

      </div>
    </div>
  </q-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useContextualIntelligence } from '../../composables/useContextualIntelligence'

const searchQuery = ref('')
const searchResults = ref([])
const activeSelectedDetail = ref(null)

const {
  drawerOpen,
  tourActive,
  tourStep,
  tourSteps,
  exploredKeys,
  conceptsMastered,
  certificationLevel,
  activeHoverKey,
  
  startWalkthrough,
  advanceWalkthrough,
  stopWalkthrough,
  searchRegistry,
  resolveKey
} = useContextualIntelligence()

const executeSearch = () => {
  if (!searchQuery.value) {
    searchResults.value = []
    return
  }
  searchResults.value = searchRegistry(searchQuery.value)
}

const selectTarget = (result) => {
  activeSelectedDetail.value = {
    title: result.title,
    description: result.description
  }
}

const loadTargetData = (key) => {
  const item = resolveKey(key)
  if (item) {
    activeSelectedDetail.value = {
      title: item.title,
      description: item.operator
    }
  }
}

const getPinnedDependencies = () => {
  if (conceptsMastered.value.length === 0) return []
  const item = resolveKey(conceptsMastered.value[0])
  return item ? item.dependencies : []
}
</script>

<style scoped>
.border-left-blue {
  border-left: 4px solid var(--enterprise-border-focus);
}

.search-result-card {
  transition: all 0.2s ease;
  background: var(--enterprise-page-bg);
}
.search-result-card:hover {
  border-color: var(--enterprise-border-focus);
}

.pulsing-text {
  animation: txtPulse 1.5s infinite;
}

@keyframes txtPulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.badge-pin-tag {
  background: rgba(252, 196, 25, 0.08);
  border: 1px solid rgba(252, 196, 25, 0.2);
  font-size: 10px;
  transition: all 0.15s ease;
}
.badge-pin-tag:hover {
  background: rgba(252, 196, 25, 0.15);
  border-color: #fcc419;
}

.bg-panel-dark {
  background-color: var(--enterprise-page-bg);
}

.node-block {
  background: var(--enterprise-panel-bg);
  transition: all 0.2s ease;
}
.active-node {
  border-color: #fcc419 !important;
  color: var(--enterprise-text-main);
  box-shadow: 0 0 10px rgba(252, 196, 25, 0.15);
}
.dependent-node {
  border-color: var(--enterprise-border-focus);
  color: var(--enterprise-text-secondary);
}
.dependent-node:hover {
  border-color: #34d399;
  color: var(--enterprise-text-main);
}

.pulsing-icon {
  animation: iconPulse 1.6s infinite;
}

@keyframes iconPulse {
  0% { transform: translateY(0); }
  50% { transform: translateY(3px); }
  100% { transform: translateY(0); }
}
</style>
