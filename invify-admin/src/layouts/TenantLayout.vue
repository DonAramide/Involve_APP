<!-- invify-admin/src/layouts/TenantLayout.vue -->
<template>
  <q-layout view="hHh Lpr lFf" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
    
    <!-- Top Extensible Portal AppBar Header -->
    <q-header elevated class="border-bottom" style="background: var(--appbar-bg); height: 48px;">
      <div class="row items-center no-wrap fit q-px-md">
        
        <!-- SECTION 1: Dynamic Tenant Identity Grid (Left) -->
        <div class="row items-center op-gap-12 no-wrap h-full flex-shrink-0">
          <q-btn
            flat
            dense
            round
            size="sm"
            color="grey-4"
            icon="menu"
            @click="sidebarCollapsed = !sidebarCollapsed"
            aria-label="Toggle navigation"
            class="q-mr-xs"
          />

          <!-- Monospace Console Engine Branding -->
          <div class="row items-center no-wrap cursor-pointer h-full" @click="$router.push('/tenant/dashboard')">
            <span class="text-metric-mono text-white text-weight-bolder" style="font-size: 15px; line-height: 1; letter-spacing: 1px;">INVIFY</span>
            <span class="text-metric-mono text-cyan-4 q-ml-xs" style="font-size: 11px; line-height: 1; padding-top: 2px;">PORTAL</span>
          </div>

          <!-- Dynamic Active Tenant Brand Logo/Title Container -->
          <div class="row items-center op-gap-6 border-indigo-left q-pl-md q-ml-sm v-hide-xs">
            <q-icon name="storefront" color="amber-4" size="xs" />
            <span class="text-metric-mono text-weight-bold text-amber-4 text-uppercase text-caption" style="font-size: 11px;">
              {{ activeBusinessName }}
            </span>
            <q-badge color="indigo-10" text-color="indigo-3" class="text-metric-sm text-weight-bold letter-spacing-1 q-ml-xs">
              {{ activeIndustry.toUpperCase() }}
            </q-badge>
          </div>
        </div>

        <q-space />

        <!-- SECTION 2: Operational Health, Telemetry & Profile (Right) -->
        <div class="row items-center op-gap-12 no-wrap flex-shrink-0">
          
          <!-- Telemetry Status Ribbon -->
          <div class="row items-center op-gap-8 no-wrap enterprise-subpanel q-px-md q-py-xs rounded-borders text-metric-mono bg-black-transparent" style="height: 32px; border: 1px solid rgba(255,255,255,0.05);">
             <span class="live-indicator-dot bg-green-5 animate-pulse"></span>
             <div class="text-right">
               <div class="text-white text-metric-mono" style="font-size: 10px; line-height: 1;">99.98% SLA</div>
               <div class="text-grey-5" style="font-size: 9px; line-height: 1; margin-top: 2px;">2.4ms LATENCY</div>
             </div>
          </div>

          <!-- Active Persistent Session Identifier -->
          <q-btn-dropdown dense flat size="sm" color="grey-3" :content-style="isDarkMode ? 'background-color: #0f172a; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 6px;' : 'background-color: #FFFFFF; border: 1px solid #D1D5DB;'" class="q-px-xs">
            <template v-slot:label>
              <div class="row items-center op-gap-8 no-wrap text-left">
                <q-avatar size="32px" color="indigo-10" text-color="indigo-3" class="text-weight-bold shadow-1 border-indigo">
                  {{ (operatorName || operatorEmail).charAt(0).toUpperCase() }}
                </q-avatar>
              
              <div class="q-ml-sm column justify-center gt-xs">
                <div class="text-caption text-weight-bold text-white" style="line-height: 1.2;">{{ operatorRole }}</div>
                <div class="text-metric-sm text-indigo-3" style="font-size: 10px; margin-top: 1px;">{{ operatorName || operatorEmail }}</div>
              </div>
              </div>
            </template>
            <q-list :dark="isDarkMode" class="bg-panel text-caption q-py-xs" style="min-width: 200px;">
              <q-item-label header class="text-operator-title text-grey-5 q-py-xs" style="font-size: 10px; letter-spacing: 1px;">PORTAL SECURE SESSION</q-item-label>
              <q-item clickable v-close-popup to="/tenant/profile" class="hover-bg rounded-borders q-mx-xs">
                <q-item-section avatar><q-icon name="manage_accounts" size="xs" color="green-4" /></q-item-section>
                <q-item-section class="text-white">My Profile & Security</q-item-section>
              </q-item>
              <q-item clickable v-close-popup to="/tenant/settings" class="hover-bg rounded-borders q-mx-xs">
                <q-item-section avatar><q-icon name="tune" size="xs" color="indigo-4" /></q-item-section>
                <q-item-section class="text-white">Business Settings</q-item-section>
              </q-item>
              
              <!-- Quick access triggers -->
              <q-item v-if="['retail', 'hospitality', 'healthcare'].includes(activeIndustry.toLowerCase())" clickable v-close-popup to="/tenant/devices" class="hover-bg rounded-borders q-mx-xs">
                <q-item-section avatar><q-icon name="vpn_key" size="xs" color="amber-4" /></q-item-section>
                <q-item-section class="text-white text-weight-bold">Device Activation</q-item-section>
              </q-item>

              <q-separator dark class="q-my-xs opacity-10" />
              <q-item clickable v-close-popup @click="executeLogout" class="hover-bg rounded-borders q-mx-xs text-red-3">
                <q-item-section avatar><q-icon name="logout" size="xs" color="red-4" /></q-item-section>
                <q-item-section class="text-weight-bold">Terminate Session</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </div>
    </q-header>

    <!-- Visual Navigation Drawer Grid -->
    <q-drawer
      v-model="sidebarCollapsed"
      show-if-above
      bordered
      style="background-color: var(--sidebar-panel-bg); color: var(--enterprise-text-secondary);"
      class="sidebar-drawer"
      :width="240"
      :breakpoint="768"
    >
      <div class="column fit" style="padding-top: 48px; overflow: hidden;">
        
        <!-- Navigation Menu Scroller -->
        <q-scroll-area class="col overflow-hidden q-px-sm q-py-md">
          
          <!-- Category 1: Standard Operational Core -->
          <div class="q-px-sm q-pb-xs text-operator-title text-uppercase text-grey-5" style="font-size: 10px; letter-spacing: 1.5px;">OPERATIONAL MATRIX</div>
          <q-list dense class="q-gutter-y-xs q-mb-md">
            <q-item
              v-for="item in coreNavigationTree"
              :key="item.path"
              clickable
              v-ripple
              :to="item.path"
              active-class="sidebar-item-active"
              class="rounded-borders text-secondary nav-item column justify-center"
              style="min-height: 34px; padding: 2px 12px;"
            >
              <div class="row items-center justify-between fit no-wrap">
                <div class="row items-center op-gap-10 no-wrap overflow-hidden">
                  <q-icon :name="item.icon" size="sm" :class="`text-${item.color || 'secondary'}`" style="min-width: 20px;" />
                  <span class="text-caption text-weight-medium ellipsis" style="font-size: 12.5px; color: inherit;">{{ item.label }}</span>
                </div>
                <q-badge :color="item.badgeBg || 'indigo-10'" :text-color="item.badgeColor || 'indigo-3'" class="text-metric-sm text-weight-bold" v-if="item.badge">
                  {{ item.badge }}
                </q-badge>
              </div>
            </q-item>
          </q-list>

          <!-- Category 2: Dynamic Industry-Specific Modules -->
          <div class="q-px-sm q-pb-xs text-operator-title text-uppercase text-grey-5 q-mt-md" style="font-size: 10px; letter-spacing: 1.5px;">INDUSTRY MODULES</div>
          <q-list dense class="q-gutter-y-xs q-mb-md">
            <q-item
              v-for="item in industryNavigationTree"
              :key="item.path"
              clickable
              v-ripple
              :to="item.path"
              active-class="sidebar-item-active"
              class="rounded-borders text-secondary nav-item column justify-center"
              style="min-height: 34px; padding: 2px 12px;"
            >
              <div class="row items-center justify-between fit no-wrap">
                <div class="row items-center op-gap-10 no-wrap overflow-hidden">
                  <q-icon :name="item.icon" size="sm" :class="`text-${item.color || 'secondary'}`" style="min-width: 20px;" />
                  <span class="text-caption text-weight-medium ellipsis" style="font-size: 12.5px; color: inherit;">{{ item.label }}</span>
                </div>
                <span class="text-metric-mono text-muted text-weight-bold" style="font-size: 9px; padding: 2px 6px; background: rgba(255,255,255,0.03); border-radius: 4px;" v-if="item.mode">
                  {{ item.mode }}
                </span>
              </div>
            </q-item>
          </q-list>
        </q-scroll-area>

        <!-- Dynamic Context Account Summary box -->
        <div class="col-auto enterprise-panel q-pa-md border-top text-caption text-secondary bg-black-transparent" style="font-size: 11px; border-top: 1px solid rgba(255,255,255,0.06);">
          <div class="row items-center justify-between q-mb-xs">
            <span class="text-secondary text-weight-bold">Live Payout Node</span>
            <span class="text-metric-mono text-green-4 text-weight-bold">ACTIVE</span>
          </div>
          <div class="row items-center justify-between">
            <span class="text-secondary">Lineage Verification</span>
            <span class="text-metric-sm text-cyan-4 text-weight-bold">REPLAY-SAFE</span>
          </div>
        </div>
      </div>
    </q-drawer>

    <!-- Master Sub-frame page layer -->
    <q-page-container class="relative-position" style="background-color: var(--enterprise-page-bg);">
      <!-- Ambient Stripe-Style Glow Background -->
      <div class="watermark-bg" style="opacity: 0.03; filter: hue-rotate(220deg);" />

      <router-view v-slot="{ Component }">
        <transition appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
          <component :is="Component" :key="$route.fullPath" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { adminApi } from '../api'

const router = useRouter()
const $q = useQuasar()

const isDarkMode = ref(true)
const sidebarCollapsed = ref(true)

const operatorEmail = ref(localStorage.getItem('operator_email') || 'owner@business.com')
const operatorName = ref('')
const operatorRole = ref(localStorage.getItem('operator_role') || 'OWNER')
const activeBusinessName = ref('')

// Industry configuration: read from localStorage (tenant_type / school, retail, etc.)
const activeIndustry = ref(localStorage.getItem('tenant_type') || '')

const getTenantIdFromToken = () => {
  // Prefer JWT tenantId for tenant operators so a stale twin in localStorage cannot stick.
  const token = localStorage.getItem('invify_token')
  const role = String(localStorage.getItem('operator_role') || '').toUpperCase()
  const isPlatform = ['SUPER_ADMIN', 'ADMIN', 'AGENT', 'SUPPORT', 'PLATFORM_ADMIN'].includes(role)

  let jwtTenant = null
  if (token) {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      const payload = JSON.parse(jsonPayload)
      jwtTenant = payload.tenantId || payload.user_metadata?.tenant_id || payload.app_metadata?.tenant_id || null
    } catch (e) {
      jwtTenant = null
    }
  }

  const explicitId = localStorage.getItem('tenant_id')
  if (isPlatform) {
    return explicitId || jwtTenant
  }
  return jwtTenant || explicitId
}

const loadTenantDetails = async () => {
  const tenantId = getTenantIdFromToken()
  if (tenantId) {
    // Keep tenant_id in sync so API interceptor can send X-Tenant-ID
    localStorage.setItem('tenant_id', tenantId)
    try {
      const res = await adminApi.getTenantDetails(tenantId)
      if (res.data && res.data.tenant) {
        activeBusinessName.value = res.data.tenant.name || ''
        activeIndustry.value = res.data.tenant.business_mode || res.data.tenant.type || ''
        localStorage.setItem('tenant_type', activeIndustry.value)
        
        // Find operator name
        if (res.data.users && res.data.users.length > 0) {
          const user = res.data.users.find(u => u.email === operatorEmail.value)
          if (user && user.full_name) {
            operatorName.value = user.full_name
          }
        }
      }
    } catch (e) {
      console.error('Failed to load active business branding:', e)
    }
  }
}

const executeLogout = () => {
  localStorage.removeItem('invify_token')
  localStorage.removeItem('operator_email')
  localStorage.removeItem('operator_role')
  localStorage.removeItem('tenant_type')
  router.push('/tenant/login')
  $q.notify({ type: 'info', message: 'Session closed successfully.' })
}

// Sidebar list for core operational metrics
const coreNavigationTree = [
  { label: 'Overview Hub', path: '/tenant/dashboard', icon: 'speed', color: 'indigo-4', badge: 'REALTIME' },
  { label: 'Transactions Ledger', path: '/tenant/transactions', icon: 'receipt_long', color: 'indigo-3' },
  { label: 'Wallet & Treasury', path: '/tenant/wallet', icon: 'account_balance_wallet', color: 'green-4' },
  { label: 'Reconciliation Center', path: '/tenant/reconciliation', icon: 'account_tree', color: 'amber-4' },
  { label: 'Staff Management', path: '/tenant/staff', icon: 'people_outline', color: 'cyan-4' },
  { label: 'BI Reports & Exports', path: '/tenant/reports', icon: 'insert_chart_outlined', color: 'purple-3' },
  { label: 'Portal Preferences', path: '/tenant/settings', icon: 'tune', color: 'grey-4' },
  { label: 'Financial Platform', path: '/tenant/settings/financial-platform', icon: 'account_balance', color: 'amber-4' },
  { label: 'My Profile & Security', path: '/tenant/profile', icon: 'manage_accounts', color: 'green-4' }
]

// Dynamic industry-specific options based on the active industry
const industryNavigationTree = computed(() => {
  const mode = activeIndustry.value.toLowerCase()
  if (mode === 'school') {
    return [
      { label: 'Dashboard', path: '/tenant/analytics', icon: 'dashboard', color: 'indigo-4', mode: 'SCHOOL' },
      { label: 'Admissions', path: '/tenant/users?pipeline=ADMISSION', icon: 'how_to_reg', color: 'indigo-3', mode: 'SCHOOL' },
      { label: 'Students', path: '/tenant/school-roster', icon: 'face', color: 'green-4', mode: 'SCHOOL' },
      { label: 'Guardians', path: '/tenant/users?type=GUARDIAN', icon: 'family_restroom', color: 'cyan-4', mode: 'SCHOOL' },
      { label: 'Academics', path: '/tenant/school-roster', icon: 'school', color: 'purple-4', mode: 'SCHOOL' },
      { label: 'School Payments', path: '/tenant/school-payments', icon: 'payments', color: 'teal-4', mode: 'SCHOOL' },
      { label: 'Finance', path: '/tenant/transactions', icon: 'receipt_long', color: 'amber-4', mode: 'SCHOOL' },
      { label: 'Inventory', path: '/tenant/retail/inventory', icon: 'inventory_2', color: 'deep-orange-4', mode: 'SCHOOL' },
      { label: 'Library', path: '/tenant/curriculum', icon: 'library_books', color: 'brown-4', mode: 'SCHOOL' },
      { label: 'Transport', path: '/tenant/logistics/fleet', icon: 'directions_bus', color: 'blue-grey-4', mode: 'SCHOOL' },
      { label: 'Staff', path: '/tenant/users?role=TEACHER', icon: 'people', color: 'grey-4', mode: 'SCHOOL' },
      { label: 'Communication', path: '/tenant/settings', icon: 'campaign', color: 'blue-4', mode: 'SCHOOL' },
      { label: 'Reports', path: '/tenant/analytics', icon: 'insert_chart', color: 'teal-4', mode: 'SCHOOL' }
    ]
  } else if (mode === 'retail') {
    return [
      { label: 'Inventory Stock Matrix', path: '/tenant/retail/inventory', icon: 'inventory_2', color: 'cyan-4', mode: 'RETAIL' },
      { label: 'Stock & Adjustments', path: '/tenant/stock', icon: 'inventory', color: 'orange-4', mode: 'RETAIL' },
      { label: 'Customer Lookup', path: '/tenant/users', icon: 'person_search', color: 'blue-4', mode: 'RETAIL' },
      { label: 'Billing Invoices', path: '/tenant/retail/invoices', icon: 'receipt', color: 'purple-3', mode: 'RETAIL' },
      { label: 'Inventory Reports', path: '/tenant/reports', icon: 'assessment', color: 'indigo-4', mode: 'RETAIL' }
    ]
  } else if (mode === 'services' || mode === 'service') {
    return [
      { label: 'Service Jobs Ledger', path: '/tenant/transactions', icon: 'work_outline', color: 'green-4', mode: 'SERVICE' },
      { label: 'Customer Directory', path: '/tenant/users', icon: 'people', color: 'blue-4', mode: 'SERVICE' },
      { label: 'Billing Invoices', path: '/tenant/retail/invoices', icon: 'receipt', color: 'purple-3', mode: 'SERVICE' },
      { label: 'Performance Analytics', path: '/tenant/reports', icon: 'insert_chart', color: 'indigo-4', mode: 'SERVICE' }
    ]
  } else if (mode === 'hospitality') {
    return [
      { label: 'Service Order Matrix', path: '/tenant/hospitality/rooms', icon: 'dry_cleaning', color: 'indigo-4', mode: 'HOTEL' },
      { label: 'Appointments & Bookings', path: '/tenant/hospitality/bookings', icon: 'calendar_today', color: 'cyan-4', mode: 'HOTEL' },
      { label: 'Service Catalog Invoicing', path: '/tenant/hospitality/billing', icon: 'receipt', color: 'green-4', mode: 'HOTEL' }
    ]
  } else if (mode === 'logistics') {
    return [
      { label: 'Fleet Vehicle Tracking', path: '/tenant/logistics/fleet', icon: 'local_shipping', color: 'amber-4', mode: 'LOGISTICS' },
      { label: 'Driver Dispatch Grid', path: '/tenant/logistics/dispatch', icon: 'explore', color: 'green-4', mode: 'LOGISTICS' },
      { label: 'Delivery Analytics', path: '/tenant/logistics/analytics', icon: 'analytics', color: 'purple-3', mode: 'LOGISTICS' }
    ]
  } else if (mode === 'healthcare') {
    return [
      { label: 'Patient Registries', path: '/tenant/healthcare/patients', icon: 'healing', color: 'red-4', mode: 'CLINIC' },
      { label: 'Pharmacy Dispensaries', path: '/tenant/healthcare/pharmacy', icon: 'medication', color: 'cyan-4', mode: 'CLINIC' },
      { label: 'Schedules & Appointments', path: '/tenant/healthcare/schedule', icon: 'event', color: 'green-4', mode: 'CLINIC' }
    ]
  }
  
  // Default to empty if nothing matches
  return []
})

onMounted(loadTenantDetails)
</script>

<style scoped>
/* Stripe/Shopify Premium dark/light themes variables */
.theme-dark {
  --appbar-bg: #0b0f19;
  --sidebar-panel-bg: #090c15;
  --enterprise-page-bg: #05070d;
  --enterprise-text-primary: #f8fafc;
  --enterprise-text-secondary: #94a3b8;
  --border-color: rgba(255,255,255,0.06);
}

.theme-light {
  --appbar-bg: #1e293b;
  --sidebar-panel-bg: #f8fafc;
  --enterprise-page-bg: #f1f5f9;
  --enterprise-text-primary: #0f172a;
  --enterprise-text-secondary: #475569;
  --border-color: rgba(0,0,0,0.06);
}

.border-bottom {
  border-bottom: 1px solid var(--border-color);
}

.border-indigo-left {
  border-left: 2px solid rgba(79, 70, 229, 0.4);
}

.bg-black-transparent {
  background: rgba(0, 0, 0, 0.2) !important;
}

.sidebar-item-active {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%) !important;
  color: #a5b4fc !important;
  border-left: 3px solid #6366f1 !important;
  border-radius: 0 6px 6px 0 !important;
}

.hover-bg:hover {
  background: rgba(255, 255, 255, 0.04) !important;
  transition: background 0.2s ease;
}

.letter-spacing-1 {
  letter-spacing: 1px;
}
</style>
