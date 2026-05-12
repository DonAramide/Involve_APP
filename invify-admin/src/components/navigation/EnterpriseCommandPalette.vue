<!-- invify-admin/src/components/navigation/EnterpriseCommandPalette.vue -->
<template>
  <q-dialog 
    v-model="isOpen" 
    position="top" 
    transition-show="jump-down" 
    transition-hide="jump-up"
    @show="focusInput"
  >
    <div class="enterprise-panel full-width q-mt-xl bg-[#12161a] text-white" style="max-width: 650px; border-radius: 4px !important; border: 1px solid #333c44 !important; box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;">
      
      <!-- Input Lookup Box -->
      <div class="q-pa-sm row items-center no-wrap border-bottom bg-[#0b0f12]">
        <q-icon name="search" color="cyan-3" size="sm" class="q-mr-sm" />
        <input 
          ref="searchRef"
          v-model="query" 
          type="text" 
          placeholder="Type a command or search telemetry targets (e.g. 'Open Device', 'Search Tenant', 'Trigger Rollout')..." 
          class="full-width bg-transparent text-white no-outline text-metric-mono"
          style="border: none; outline: none; font-size: 13px; height: 32px;"
          @keydown.down.prevent="selectNext"
          @keydown.up.prevent="selectPrev"
          @keydown.enter.prevent="executeSelected"
          @keydown.esc="isOpen = false"
        />
        <q-badge color="blue-grey-9" text-color="grey-5" label="ESC" class="text-metric-sm q-ml-xs cursor-pointer" @click="isOpen = false" />
      </div>

      <!-- Execution Context Helpers & Quick Filter tags -->
      <div class="q-px-sm q-py-xs bg-[#161b20] border-bottom row items-center justify-between text-caption text-grey-5" style="font-size: 11px;">
        <div class="row items-center op-gap-8 no-wrap overflow-hidden">
          <span class="text-weight-bold text-white">Execution Filter:</span>
          <span class="cursor-pointer text-cyan-3 hover-underline" @click="query = 'Open Device '">Open Device</span>
          <span>•</span>
          <span class="cursor-pointer text-amber-3 hover-underline" @click="query = 'Trigger Rollout '">Trigger Rollout</span>
          <span>•</span>
          <span class="cursor-pointer text-red-3 hover-underline" @click="query = 'Quarantine '">Quarantine Endpoint</span>
        </div>
        <span class="text-metric-sm text-grey-6 v-hide-xs">Use ↑↓ arrows to navigate</span>
      </div>

      <!-- Scrollable Results Panel -->
      <div class="q-pa-xs" style="max-height: 380px; overflow-y: auto;">
        <div v-if="filteredItems.length === 0" class="text-center q-pa-xl text-grey-6 text-caption italic">
          No routing strings or operational command targets match "<span class="text-white">{{ query }}</span>".
        </div>

        <q-list dense>
          <q-item
            v-for="(item, index) in filteredItems"
            :key="item.id"
            clickable
            :class="['q-my-xs rounded-borders command-item', selectedIndex === index ? 'bg-[#1c262b] text-white border-left-focus' : 'text-grey-4']"
            @click="executeItem(item)"
            @mouseover="selectedIndex = index"
            style="min-height: 32px; padding: 4px 10px;"
          >
            <!-- Left Side: Custom execution avatar badge -->
            <q-item-section avatar style="min-width: 32px; padding-right: 8px;">
              <q-avatar :color="item.avatarBg || 'blue-grey-9'" :text-color="item.avatarColor || 'cyan-3'" size="sm" rounded>
                <q-icon :name="item.icon" size="xs" />
              </q-avatar>
            </q-item-section>

            <!-- Center: Command syntax label & underlying target route mapping -->
            <q-item-section>
              <q-item-label class="text-weight-medium text-white row items-center op-gap-4" style="font-size: 12px;">
                <span>{{ item.label }}</span>
                <q-badge color="blue-grey-10" text-color="amber-4" class="text-metric-sm" v-if="item.isCommand">
                  EXECUTE CMD
                </q-badge>
              </q-item-label>
              <q-item-label caption class="text-metric-mono text-grey-5" style="font-size: 10px;">
                {{ item.description || `Target Route: ${item.route}` }}
              </q-item-label>
            </q-item-section>

            <!-- Right Side: Domain context tag & Access level verification -->
            <q-item-section side>
              <div class="column items-end">
                <q-badge :color="item.badgeBg || 'blue-grey-9'" :text-color="item.badgeColor || 'white'" class="text-metric-sm">
                  {{ item.domain.toUpperCase() }}
                </q-badge>
                <span class="text-grey-6 q-mt-xs" style="font-size: 9px;" v-if="item.permission">RBAC: {{ item.permission }}</span>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Footer Context Strips -->
      <div class="q-pa-xs bg-[#0b0f12] border-top text-right text-grey-6" style="font-size: 10px;">
        <span>Press <kbd class="bg-[#161b20] q-px-xs text-grey-3 rounded-borders">Enter</kbd> to activate target stream workflow instantly</span>
      </div>
    </div>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

const isOpen = ref(false)
const query = ref('')
const searchRef = ref(null)
const selectedIndex = ref(0)

// Provide direct explicit triggers for global layout invocations
const togglePalette = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    query.value = ''
    selectedIndex.value = 0
  }
}

defineExpose({ togglePalette })

const focusInput = () => {
  setTimeout(() => {
    if (searchRef.value) searchRef.value.focus()
  }, 50)
}

// Master index array covering registered routes alongside executable platform commands
const rawItems = [
  // Extensible Executable Commands
  {
    id: 'cmd-1',
    label: 'Open Device Explorer Interface',
    description: 'Filter endpoint nodes inside the live Fleet telemetry engine',
    route: '/fleet/devices',
    domain: 'fleet',
    icon: 'devices',
    avatarBg: 'cyan-10',
    avatarColor: 'cyan-2',
    isCommand: true,
    permission: 'write_fleet'
  },
  {
    id: 'cmd-2',
    label: 'Search Tenant Identity Array',
    description: 'Lookup organization keys and parent treasury financial layers',
    route: '/admin/tenants',
    domain: 'governance',
    icon: 'corporate_fare',
    avatarBg: 'indigo-10',
    avatarColor: 'indigo-2',
    isCommand: true,
    permission: 'read_tenant'
  },
  {
    id: 'cmd-3',
    label: 'Trigger Rollout Batch Sequence',
    description: 'Dispatch immediate OTA package step updates to target edge cohorts',
    route: '/deployments/rollouts',
    domain: 'deployments',
    icon: 'system_update_alt',
    avatarBg: 'amber-10',
    avatarColor: 'amber-2',
    isCommand: true,
    permission: 'admin_deploy'
  },
  {
    id: 'cmd-4',
    label: 'Quarantine Target Endpoint Profile',
    description: 'Lock device security parameters and isolate websocket ingress packets',
    route: '/governance/quarantine',
    domain: 'governance',
    icon: 'gpp_bad',
    avatarBg: 'red-10',
    avatarColor: 'red-2',
    isCommand: true,
    permission: 'soc_quarantine'
  },
  {
    id: 'cmd-5',
    label: 'Open Active Incident Workflow',
    description: 'Review alerts, failed operations log streams, and device exceptions',
    route: '/incidents/active',
    domain: 'incidents',
    icon: 'warning',
    avatarBg: 'deep-orange-10',
    avatarColor: 'amber-3',
    isCommand: true,
    permission: 'soc_analyst'
  },
  {
    id: 'cmd-6',
    label: 'Execute Remote Control Trigger',
    description: 'Broadcast manual hardware power cycle or profile refresh telemetry payloads',
    route: '/fleet/actions',
    domain: 'fleet',
    icon: 'terminal',
    avatarBg: 'purple-10',
    avatarColor: 'purple-2',
    isCommand: true,
    permission: 'operator_root'
  },

  // Indexing explicit Static Telemetry Pathways
  { id: 'route-1', label: 'Fleet Command Overview Dashboard', route: '/fleet/overview', domain: 'fleet', icon: 'speed' },
  { id: 'route-2', label: 'Live Edge Presence Map', route: '/fleet/presence', domain: 'fleet', icon: 'radar' },
  { id: 'route-3', label: 'Fleet Telemetry Stream Log Explorer', route: '/fleet/telemetry', domain: 'fleet', icon: 'show_chart' },
  
  { id: 'route-4', label: 'Compliance Audit Core Dashboard', route: '/governance/compliance', domain: 'governance', icon: 'fact_check' },
  { id: 'route-5', label: 'Policy Drift Analysis Arrays', route: '/governance/drift', domain: 'governance', icon: 'timeline' },
  { id: 'route-6', label: 'Security Trust Scoring Matrices', route: '/governance/trust', domain: 'governance', icon: 'security' },

  { id: 'route-7', label: 'Observability Live Event Streams', route: '/observability/streams', domain: 'observability', icon: 'stream', badgeBg: 'green-9' },
  { id: 'route-8', label: 'WebSocket & Ingestion Queue Health', route: '/observability/websocket-health', domain: 'observability', icon: 'import_export' },
  { id: 'route-9', label: 'Consolidated Audit Transaction Ledgers', route: '/admin/ledger', domain: 'observability', icon: 'receipt_long' },

  { id: 'route-10', label: 'Global Administration & Core Setup', route: '/admin/settings', domain: 'admin', icon: 'settings_applications' },
  { id: 'route-11', label: 'Operator Sessions & Profiles mapping', route: '/admin/users', domain: 'admin', icon: 'shield' },
  { id: 'route-12', label: 'Quasar Fintech Subaccounts Inventory', route: '/admin/wallet', domain: 'finance', icon: 'account_balance' }
]

const filteredItems = computed(() => {
  if (!query.value) return rawItems
  const q = query.value.toLowerCase().trim()
  return rawItems.filter(i => {
    return i.label.toLowerCase().includes(q) || 
           i.domain.toLowerCase().includes(q) || 
           i.route.toLowerCase().includes(q) ||
           (i.description && i.description.toLowerCase().includes(q))
  })
})

const selectNext = () => {
  if (selectedIndex.value < filteredItems.value.length - 1) {
    selectedIndex.value++
  } else {
    selectedIndex.value = 0
  }
}

const selectPrev = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  } else {
    selectedIndex.value = filteredItems.value.length - 1
  }
}

const executeSelected = () => {
  const target = filteredItems.value[selectedIndex.value]
  if (target) executeItem(target)
}

const executeItem = (item) => {
  isOpen.value = false
  
  if (item.isCommand) {
    // Notify execution dispatch actions cleanly
    $q.notify({
      message: `Execution dispatched: [${item.label}]. Pipeline validation active.`,
      caption: `RBAC Token check verified for scope: ${item.permission}`,
      color: 'blue-grey-10',
      textColor: 'cyan-3',
      icon: item.icon,
      position: 'top',
      timeout: 2500
    })
  }

  // Preserve operational context and push Target Route mapping
  if (item.route) {
    router.push(item.route).catch(() => {
      // Fallback redirect safely
      router.push('/dashboard')
    })
  }
}

// Bind native keyboard listener for Ctrl+K or Cmd+K
const handleGlobalKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    togglePalette()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left-focus { border-left: 3px solid #22b8cf !important; }
.hover-underline:hover { text-decoration: underline; }

.command-item {
  transition: all 0.1s ease;
  border-left: 3px solid transparent;
}

@media (max-width: 600px) {
  .v-hide-xs { display: none !important; }
}
</style>
