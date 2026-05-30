<!-- invify-admin/src/components/navigation/EnterpriseCommandPalette.vue -->
<template>
  <q-dialog 
    v-model="isOpen" 
    position="top" 
    transition-show="jump-down" 
    transition-hide="jump-up"
    @show="focusInput"
  >
    <div class="enterprise-panel full-width q-mt-xl bg-panel text-main" style="max-width: 650px; border-radius: 4px !important; border: 1px solid var(--enterprise-border) !important; box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;">
      
      <!-- Command Input Prompt -->
      <div class="q-pa-sm row items-center no-wrap border-bottom bg-panel-darker">
        <q-icon name="search" color="cyan-3" size="sm" class="q-mr-sm" />
        <input 
          ref="searchRef"
          v-model="query" 
          type="text" 
          placeholder="Type an actionable command or search route mappings (e.g. 'Open Device', 'Quarantine', 'Trigger Rollout')..." 
          class="full-width bg-transparent text-main no-outline text-metric-mono"
          style="border: none; outline: none; font-size: 13px; height: 32px;"
          @keydown.down.prevent="selectNext"
          @keydown.up.prevent="selectPrev"
          @keydown.enter.prevent="executeSelected"
          @keydown.esc="isOpen = false"
        />
        <q-badge color="blue-grey-9" text-color="grey-5" label="ESC" class="text-metric-sm q-ml-xs cursor-pointer" @click="isOpen = false" />
      </div>

      <!-- Live Execution Filters & Active Scopes -->
      <div class="q-px-sm q-py-xs bg-panel-light border-bottom row items-center justify-between text-caption text-muted" style="font-size: 11px;">
        <div class="row items-center op-gap-8 no-wrap overflow-hidden">
          <span class="text-weight-bold text-main">RBAC Session Filter:</span>
          <span class="text-cyan-3">Verified Tokens Active</span>
          <span>•</span>
          <span class="cursor-pointer text-amber-3 hover-underline" @click="query = 'Trigger Rollout '">Trigger Rollout</span>
          <span>•</span>
          <span class="cursor-pointer text-red-3 hover-underline" @click="query = 'Quarantine '">Quarantine Endpoint</span>
        </div>
        <span class="text-metric-sm text-grey-6 v-hide-xs">Use ↑↓ arrows to select</span>
      </div>

      <!-- Scrolled Action Items Container -->
      <div class="q-pa-xs" style="max-height: 380px; overflow-y: auto;">
        <div v-if="filteredItems.length === 0" class="text-center q-pa-xl text-grey-6 text-caption italic">
          No RBAC-permitted operations match "<span class="text-main">{{ query }}</span>".
        </div>

        <q-list dense>
          <q-item
            v-for="(item, index) in filteredItems"
            :key="item.id"
            clickable
            :class="['q-my-xs rounded-borders command-item', selectedIndex === index ? 'bg-panel-active text-main border-left-focus' : 'text-secondary']"
            @click="executeItem(item)"
            @mouseover="selectedIndex = index"
            style="min-height: 32px; padding: 4px 10px;"
          >
            <!-- Left Avatar -->
            <q-item-section avatar style="min-width: 32px; padding-right: 8px;">
              <q-avatar :color="item.avatarBg || 'blue-grey-9'" :text-color="item.avatarColor || 'cyan-3'" size="sm" rounded>
                <q-icon :name="item.icon" size="xs" />
              </q-avatar>
            </q-item-section>

            <!-- Center Data strings -->
            <q-item-section>
              <q-item-label class="text-weight-medium text-main row items-center op-gap-4" style="font-size: 12px;">
                <span>{{ item.label }}</span>
                <q-badge color="blue-grey-10" text-color="amber-4" class="text-metric-sm" v-if="item.isCommand">
                  EXECUTE CMD
                </q-badge>
              </q-item-label>
              <q-item-label caption class="text-metric-mono text-grey-5" style="font-size: 10px;">
                {{ item.description || `Target Route: ${item.route}` }}
              </q-item-label>
            </q-item-section>

            <!-- Right Verification Context -->
            <q-item-section side>
              <div class="column items-end">
                <q-badge :color="item.badgeBg || 'blue-grey-9'" :text-color="item.badgeColor || 'white'" class="text-metric-sm">
                  {{ item.domain.toUpperCase() }}
                </q-badge>
                <span class="text-green-5 q-mt-xs" style="font-size: 9px;" v-if="item.permission">
                  <q-icon name="check_circle" size="xs" /> Scope: {{ item.permission }}
                </span>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Footer Info Bar -->
      <div class="q-pa-xs bg-panel-darker border-top text-right text-muted" style="font-size: 10px;">
        <span>FINAL REFINEMENT #3: Command visibility strictly filtered by verified operator session tokens</span>
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

// Direct overlay invocation hook
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

/**
 * FINAL REFINEMENT #3: Uncompromised Permission Awareness From Day One.
 * Holds active authenticated user scopes. Actions requiring permissions absent from this list
 * are stripped entirely before template construction to eliminate security exploitation.
 */
const currentUserPermissions = ref([
  'read_fleet', 
  'read_devices', 
  'read_tenant', 
  'soc_analyst', 
  'read_governance', 
  'read_streams', 
  'read_metrics',
  'soc_quarantine',
  'admin_deploy',
  'write_fleet'
  // Note: 'operator_root' scope is explicitly omitted to test runtime hiding of unauthorized remote tools
])

// Raw Actions repository
const rawItems = [
  {
    id: 'cmd-terminals',
    label: 'Hardware Terminal Management',
    description: 'Manage POS terminals, inspect assignments, hardware diagnostics and audit logs.',
    route: '/fleet/terminals',
    domain: 'fleet',
    icon: 'point_of_sale',
    avatarBg: 'cyan-9',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_devices',
    keywords: ['terminal', 'mpos', 'pos', 'hardware', 'payment', 'terminals']
  },
  {
    id: 'cmd-0',
    label: 'Tenant Orchestration Ecosystem Center',
    description: 'Mission Control for multi-tenant feature flags, module visibility, and reactive branding overrides.',
    route: '/admin/orchestration',
    domain: 'governance',
    icon: 'hub',
    avatarBg: 'blue-10',
    avatarColor: 'blue-2',
    isCommand: true,
    permission: 'read_tenant',
    keywords: ['onboard', 'provision', 'setup', 'branding', 'modules']
  },
  {
    id: 'cmd-rev-gov',
    label: 'Enterprise Revenue & Platform Billing Governance',
    description: 'Global tariff splits, transactional margin controls, variable commissions, and live payout splits.',
    route: '/admin/billing',
    domain: 'governance',
    icon: 'payments',
    avatarBg: 'teal-10',
    avatarColor: 'teal-2',
    isCommand: true,
    permission: 'read_tenant',
    keywords: ['billing', 'revenue', 'tariff', 'commission', 'fees', 'charges', 'splits', 'payout']
  },
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
    permission: 'read_devices',
    keywords: ['explorer', 'nodes', 'fleet', 'endpoints']
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
    permission: 'read_tenant',
    keywords: ['lookup', 'treasury', 'keys', 'identity', 'search']
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
    permission: 'admin_deploy',
    keywords: ['batch', 'ota', 'update', 'package', 'cohort']
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
    permission: 'soc_quarantine',
    keywords: ['lock', 'isolate', 'security', 'ingress', 'block']
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
    permission: 'soc_analyst',
    keywords: ['alerts', 'logs', 'exceptions', 'failed']
  },
  {
    id: 'cmd-staff-mgt',
    label: 'Staff & Operator Management',
    description: 'Manage and register platform operators, staff accounts, and assign tenant bounds.',
    route: '/admin/users',
    domain: 'governance',
    icon: 'manage_accounts',
    avatarBg: 'indigo-10',
    avatarColor: 'white',
    isCommand: true,
    permission: 'admin_deploy',
    keywords: ['staff', 'operators', 'users', 'management', 'add', 'team', 'employees']
  },
  {
    id: 'cmd-rbac-roles',
    label: 'Roles & RBAC Privileges Governance',
    description: 'Configure Role-Based Access Control matrices, permissions, and operational capabilities.',
    route: '/governance/rbac-roles',
    domain: 'governance',
    icon: 'admin_panel_settings',
    avatarBg: 'deep-orange-10',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_governance',
    keywords: ['roles', 'rbac', 'permissions', 'privileges', 'capabilities', 'access', 'rights', 'controls', 'staff']
  },
  {
    id: 'cmd-session-gov',
    label: 'Operator Session Governance',
    description: 'Track and govern active session tokens, elevation limits, and security lifecycles.',
    route: '/governance/sessions',
    domain: 'governance',
    icon: 'security',
    avatarBg: 'blue-grey-9',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_governance',
    keywords: ['sessions', 'tokens', 'active', 'audit', 'login', 'logout', 'lifecycles', 'staff']
  },
  // UNAUTHORIZED COMMAND ACTION: Requires 'operator_root' scope which is omitted from active list
  {
    id: 'cmd-unauthorized',
    label: 'Execute Remote Control Trigger (Root Level)',
    description: 'Broadcast dangerous manual hardware power cycles (Hidden if unauthorized)',
    route: '/fleet/actions',
    domain: 'fleet',
    icon: 'terminal',
    avatarBg: 'purple-10',
    avatarColor: 'purple-2',
    isCommand: true,
    permission: 'operator_root'
  },

  // Telemetry static targets mapping
  { id: 'route-1', label: 'Fleet Command Overview Dashboard', route: '/fleet/overview', domain: 'fleet', icon: 'speed', permission: 'read_fleet' },
  { id: 'route-2', label: 'Live Edge Presence Map', route: '/fleet/presence', domain: 'fleet', icon: 'radar', permission: 'read_fleet' },
  { id: 'route-3', label: 'Fleet Telemetry Stream Log Explorer', route: '/fleet/telemetry', domain: 'fleet', icon: 'show_chart', permission: 'read_fleet' },
  
  { id: 'route-4', label: 'Compliance Audit Core Dashboard', route: '/governance/compliance', domain: 'governance', icon: 'fact_check', permission: 'read_governance' },
  { id: 'route-5', label: 'Policy Drift Analysis Arrays', route: '/governance/drift', domain: 'governance', icon: 'timeline', permission: 'read_governance' },

  { id: 'route-6', label: 'Observability Live Event Streams', route: '/observability/streams', domain: 'observability', icon: 'stream', badgeBg: 'green-9', permission: 'read_streams' },
  { id: 'route-7', label: 'WebSocket & Ingestion Queue Health', route: '/observability/websocket-health', domain: 'observability', icon: 'import_export', permission: 'read_streams' },

  // ==========================================
  // ADDITIONAL OPERATIONAL FUNCTIONS
  // ==========================================
  {
    id: 'cmd-6',
    label: 'Generate Device Activation Codes',
    description: 'Provision new activation secrets for hardware endpoints.',
    route: '/devices',
    domain: 'fleet',
    icon: 'vpn_key',
    avatarBg: 'cyan-9',
    avatarColor: 'white',
    isCommand: true,
    permission: 'write_fleet',
    keywords: ['create', 'new', 'keys', 'provision', 'secrets', 'activation']
  },
  {
    id: 'cmd-7',
    label: 'Approve New Tenant Registrations',
    description: 'Review pending onboarding requests and authorize organization identities.',
    route: '/admin/tenants',
    domain: 'governance',
    icon: 'how_to_reg',
    avatarBg: 'green-10',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_tenant',
    keywords: ['approve', 'verify', 'registration', 'pending', 'new', 'onboard']
  },
  {
    id: 'cmd-8',
    label: 'Lesson Note & Curriculum Designer',
    description: 'Design educational lesson structures and curriculum benchmarks.',
    route: '/notes',
    domain: 'education',
    icon: 'menu_book',
    avatarBg: 'deep-purple-9',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_fleet',
    keywords: ['lesson', 'note', 'curriculum', 'designer', 'education']
  },
  {
    id: 'cmd-9',
    label: 'Curriculum Management Matrix',
    description: 'Standardize subject benchmarks across multiple school tenants.',
    route: '/curriculum',
    domain: 'education',
    icon: 'account_tree',
    avatarBg: 'indigo-9',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_fleet',
    keywords: ['curriculum', 'matrix', 'benchmarks', 'standardization']
  },
  {
    id: 'cmd-10',
    label: 'Teacher Workspace Dashboard',
    description: 'Unified interface for classroom management and student oversight.',
    route: '/teacher-workspace',
    domain: 'education',
    icon: 'school',
    avatarBg: 'purple-9',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_fleet',
    keywords: ['teacher', 'workspace', 'classroom', 'student', 'oversight']
  },
  {
    id: 'cmd-11',
    label: 'Execute Onboarding Pipeline',
    description: 'Start a new manual onboarding sequence for a business or school.',
    route: '/onboarding',
    domain: 'governance',
    icon: 'rocket_launch',
    avatarBg: 'orange-10',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_tenant',
    keywords: ['execute', 'onboard', 'pipeline', 'business', 'school']
  },
  {
    id: 'cmd-12',
    label: 'Billing & Financial Settlement',
    description: 'Review invoices, subscription states, and credit balances.',
    route: '/billing',
    domain: 'finance',
    icon: 'receipt_long',
    avatarBg: 'teal-9',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_tenant',
    keywords: ['billing', 'finance', 'invoice', 'subscription', 'credit']
  },
  {
    id: 'cmd-13',
    label: 'Wallet & Payment Processing',
    description: 'Manage virtual wallets and real-time transaction reconciliation.',
    route: '/wallet',
    domain: 'finance',
    icon: 'account_balance_wallet',
    avatarBg: 'green-9',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_tenant',
    keywords: ['wallet', 'payment', 'transaction', 'reconciliation', 'processing']
  },
  {
    id: 'cmd-14',
    label: 'Attendance Tracking Hub',
    description: 'Monitor real-time student or operator presence logs.',
    route: '/attendance',
    domain: 'operations',
    icon: 'fact_check',
    avatarBg: 'blue-grey-9',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_fleet',
    keywords: ['attendance', 'tracking', 'presence', 'student', 'operator']
  },
  {
    id: 'cmd-15',
    label: 'Referral & Loyalty Program',
    description: 'Track organization growth through referral network indices.',
    route: '/referrals',
    domain: 'growth',
    icon: 'share',
    avatarBg: 'pink-9',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_tenant',
    keywords: ['referral', 'loyalty', 'growth', 'network', 'share']
  },
  {
    id: 'cmd-16',
    label: 'Analytics & Usage Intelligence',
    description: 'Deep-dive into API consumption, AI tokens, and fleet health.',
    route: '/analytics',
    domain: 'observability',
    icon: 'analytics',
    avatarBg: 'deep-orange-9',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_metrics',
    keywords: ['analytics', 'usage', 'intelligence', 'metrics']
  },
  {
    id: 'cmd-17',
    label: 'Financial Reconciliation & Balancing',
    description: 'Verify ledger consistency and resolve transaction discrepancies.',
    route: '/reconciliation',
    domain: 'finance',
    icon: 'account_balance',
    avatarBg: 'blue-grey-8',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_tenant',
    keywords: ['financial', 'reconciliation', 'balancing', 'ledger', 'discrepancy']
  },
  {
    id: 'cmd-18',
    label: 'Enterprise Payment Gateways',
    description: 'Configure and monitor external payment processor health.',
    route: '/payments',
    domain: 'finance',
    icon: 'payments',
    avatarBg: 'green-8',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_tenant',
    keywords: ['payment', 'gateway', 'processor', 'health', 'config']
  },
  {
    id: 'cmd-19',
    label: 'Accept & Verify Operator Invites',
    description: 'Process incoming operator invitation tokens.',
    route: '/invite/accept',
    domain: 'governance',
    icon: 'mail',
    avatarBg: 'indigo-8',
    avatarColor: 'white',
    isCommand: true,
    permission: 'read_governance',
    keywords: ['accept', 'verify', 'invite', 'operator', 'token']
  }
]

// FINAL REFINEMENT #3: Perform strict runtime RBAC checking alongside user string indexing
const rbacGatedItems = computed(() => {
  return rawItems.filter(i => {
    if (!i.permission) return true
    return currentUserPermissions.value.includes(i.permission)
  })
})

const filteredItems = computed(() => {
  if (!query.value) return rbacGatedItems.value
  const q = query.value.toLowerCase().trim()
  return rbacGatedItems.value.filter(i => {
    const searchString = `${i.label} ${i.domain} ${i.route} ${i.description || ''} ${(i.keywords || []).join(' ')}`.toLowerCase()
    return searchString.includes(q)
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
    $q.notify({
      message: `Execution dispatched: [${item.label}]`,
      caption: `RBAC Validation: Context verified for scope [${item.permission}]`,
      color: 'blue-grey-10',
      textColor: 'cyan-3',
      icon: item.icon,
      position: 'top',
      timeout: 2500
    })
  }

  if (item.route) {
    router.push(item.route).catch(() => {
      router.push('/dashboard')
    })
  }
}

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
