<!-- invify-admin/src/pages/TenantDetailPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white" v-if="tenant">
    <!-- Breadcrumbs & Header -->
    <div class="q-mb-md">
      <q-breadcrumbs class="text-grey-6" gutter="sm">
        <q-breadcrumbs-el label="Dashboards" icon="dashboard" to="/" />
        <q-breadcrumbs-el label="Tenants" icon="business" to="/tenants" />
        <q-breadcrumbs-el :label="tenant.name" />
      </q-breadcrumbs>
    </div>

    <div class="row items-center q-mb-xl">
      <q-avatar size="72px" font-size="36px" color="indigo-10" text-color="indigo-3" icon="business" class="q-mr-md shadow-2" />
      <div class="col">
        <div class="row items-center q-gutter-sm">
          <h1 class="text-h4 text-weight-bold q-ma-none">{{ tenant.name }}</h1>
          <q-chip :color="tenant.status === 'active' ? 'green-10' : 'red-10'" text-color="white" size="md">
            {{ tenant.status?.toUpperCase() }}
          </q-chip>
        </div>
        <div class="text-grey-5">{{ tenant.type?.toUpperCase() }} • Plan: {{ tenant.plan?.toUpperCase() }} • ID: {{ tenant.id }}</div>
      </div>
      <div class="col-auto">
        <q-btn outline color="indigo-4" icon="edit" label="Edit" @click="openEditModal" class="q-mr-sm" />
        <q-btn flat color="grey-6" icon="refresh" @click="fetchDetails" />
      </div>
    </div>

    <!-- Tabbed Content -->
    <q-card class="bg-blue-grey-10 shadow-2 overflow-hidden">
      <q-tabs
        v-model="tab"
        dense
        class="text-grey-5 bg-blue-grey-10 shadow-2"
        active-color="cyan-4"
        indicator-color="cyan-4"
        align="left"
        narrow-indicator
      >
        <q-tab name="overview" label="Overview" icon="analytics" />
        <q-tab name="users" label="Users" icon="person" />
        <q-tab name="wallet" label="Wallet" icon="wallet" />
        <q-tab name="usage" label="AI Usage" icon="psychology" />
      </q-tabs>

      <q-separator dark />

      <q-tab-panels v-model="tab" animated class="bg-blue-grey-10 text-white min-height-400">
        <!-- Overview Panel -->
        <q-tab-panel name="overview">
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-6">
              <div class="text-subtitle1 text-indigo-3 q-mb-md">Organization Details</div>
              <q-list bordered separator dark class="rounded-borders">
                <q-item>
                  <q-item-section class="text-grey-5">Type</q-item-section>
                  <q-item-section side class="text-white">{{ tenant.type }}</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section class="text-grey-5">Registered</q-item-section>
                  <q-item-section side class="text-white">{{ new Date(tenant.created_at).toLocaleString() }}</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section class="text-grey-5">Plan Expiry</q-item-section>
                  <q-item-section side>
                    <q-chip :color="!tenant.plan_expires_at ? 'grey-9' : (new Date(tenant.plan_expires_at) < new Date() ? 'red-10' : 'indigo-9')" 
                            text-color="white" dense size="sm">
                      {{ tenant.plan_expires_at ? new Date(tenant.plan_expires_at).toLocaleDateString() : 'PERMANENT' }}
                    </q-chip>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section class="text-grey-5">API Key Status</q-item-section>
                  <q-item-section side>
                    <q-chip :icon="tenant.quaser_api_key ? 'verified' : 'warning'" 
                            :color="tenant.quaser_api_key ? 'green-9' : 'orange-9'" 
                            dense size="xs" text-color="white">
                      {{ tenant.quaser_api_key ? 'CONFIGURED' : 'NOT SET' }}
                    </q-chip>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
            <div class="col-12 col-md-6 text-center flex flex-center">
              <div v-if="wallet">
                <div class="text-overline text-grey-5">Current Wallet Balance</div>
                <div class="text-h2 text-weight-bolder text-cyan-4">₦{{ wallet.balance.toLocaleString() }}</div>
                <div class="text-caption text-grey-6 q-mt-xs">Last updated {{ new Date(wallet.updated_at).toLocaleTimeString() }}</div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- Users Panel (Placeholder) -->
        <q-tab-panel name="users">
          <div class="flex flex-center q-pa-xl text-grey-6">
            <q-icon name="group" size="4em" />
            <div class="q-ml-md">User management for this tenant is coming in the next Phase.</div>
          </div>
        </q-tab-panel>

        <!-- Wallet Panel (Placeholder) -->
        <q-tab-panel name="wallet">
           <div class="text-subtitle1 text-indigo-3 q-mb-md">Ledger History (Tenant Specific)</div>
           <div class="text-grey-6 text-center q-pa-xl">Wallet management interface implementation is pending Phase 4.</div>
        </q-tab-panel>

        <!-- AI Usage Panel -->
        <q-tab-panel name="usage">
          <div class="text-subtitle1 text-indigo-3 q-mb-md">Recent AI Activity</div>
          <div v-if="recentUsage?.length">
            <q-list dark separator>
              <q-item v-for="log in recentUsage" :key="log.id">
                <q-item-section avatar><q-icon name="psychology" color="purple-4" /></q-item-section>
                <q-item-section>
                  <q-item-label>{{ log.request_type }}</q-item-label>
                  <q-item-label caption class="text-grey-6">{{ new Date(log.created_at).toLocaleString() }}</q-item-label>
                </q-item-section>
                <q-item-section side class="text-white">{{ log.tokens_used }} tokens</q-item-section>
              </q-item>
            </q-list>
          </div>
          <div v-else class="text-center q-pa-xl text-grey-6">No AI usage recorded for this tenant yet.</div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-page>

  <q-inner-loading :showing="loading" dark color="indigo-4" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { adminApi } from '../api'

const $q = useQuasar()
const $route = useRoute()

const tab = ref('overview')
const loading = ref(true)
const tenant = ref(null)
const users = ref([])
const wallet = ref(null)
const recentUsage = ref([])

const fetchDetails = async () => {
  loading.value = true
  try {
    const { data } = await adminApi.getTenantDetails($route.params.id)
    tenant.value = data.tenant
    users.value = data.users
    wallet.value = data.wallet
    recentUsage.value = data.recentUsage
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetails)
</script>

<style scoped>
.min-height-400 {
  min-height: 400px;
}
</style>
