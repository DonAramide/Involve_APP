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

        <!-- Users Panel -->
        <q-tab-panel name="users" class="q-pa-none">
          <q-table
            :rows="users"
            :columns="[
              { name: 'full_name', label: 'NAME', field: 'full_name', align: 'left', sortable: true },
              { name: 'email', label: 'EMAIL', field: 'email', align: 'left', sortable: true },
              { name: 'role', label: 'ROLE', field: 'role', align: 'center', format: val => val?.toUpperCase() },
              { name: 'status', label: 'STATUS', field: 'status', align: 'center' }
            ]"
            row-key="id"
            flat
            dark
            class="bg-blue-grey-10"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip :color="props.value === 'active' ? 'green-9' : 'grey-8'" text-color="white" size="xs" dense>
                  {{ props.value?.toUpperCase() || 'OFFLINE' }}
                </q-chip>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Wallet Panel -->
        <q-tab-panel name="wallet">
          <div class="row q-col-gutter-md">
            <!-- Parent Account Info -->
            <div class="col-12 col-md-4">
              <q-card bordered flat class="bg-blue-grey-9 border-indigo">
                <q-card-section>
                  <div class="text-overline text-indigo-3">Parent Account (Master)</div>
                  <div v-if="wallet.subAccount">
                    <div class="text-h6">{{ wallet.subAccount.bank_name }}</div>
                    <div class="text-h4 text-weight-bold letter-spacing-1 q-my-sm text-cyan-4">{{ wallet.subAccount.account_number }}</div>
                    <div class="text-caption text-grey-5">Account Name: {{ wallet.subAccount.account_name }}</div>
                  </div>
                  <div v-else class="text-grey-6 q-pa-md">No parent sub-account configured via Quasar SDK.</div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Virtual Accounts Inventory -->
            <div class="col-12 col-md-8">
              <div class="text-subtitle2 text-grey-5 q-mb-sm">Generated Virtual Accounts (Static & Ongoing)</div>
              <div class="row q-col-gutter-sm">
                <div v-for="acc in wallet.virtualAccounts" :key="acc.account_number" class="col-12 col-sm-6">
                  <q-card flat bordered class="bg-blue-grey-10 border-cyan">
                    <q-card-section class="q-pa-sm">
                      <div class="row items-center no-wrap">
                        <q-avatar icon="account_balance" color="cyan-10" text-color="cyan-3" size="32px" />
                        <div class="q-ml-sm overflow-hidden">
                          <div class="text-weight-bold text-white no-wrap ellipsis">{{ acc.account_number }}</div>
                          <div class="text-caption text-grey-6 no-wrap ellipsis">{{ acc.bank_name }} • {{ acc.type || 'STATIC' }}</div>
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
                <div v-if="!wallet.virtualAccounts?.length" class="col-12 text-grey-7 q-pa-lg text-center border-dashed rounded-borders">
                  No virtual accounts generated for this tenant.
                </div>
              </div>
            </div>

            <!-- Transactions Table -->
            <div class="col-12 q-mt-lg">
              <div class="text-subtitle1 text-indigo-3 q-mb-md">Consolidated Transaction Ledger</div>
              <q-table
                :rows="wallet.transactions"
                :columns="[
                  { name: 'date', label: 'DATE', field: 'created_at', align: 'left', format: val => new Date(val).toLocaleString() },
                  { name: 'type', label: 'TYPE', field: 'type', align: 'center' },
                  { name: 'amount', label: 'AMOUNT', field: 'amount', align: 'right' },
                  { name: 'description', label: 'DESCRIPTION', field: 'description', align: 'left' }
                ]"
                row-key="id"
                flat
                dark
                dense
                class="bg-blue-grey-10"
              >
                <template v-slot:body-cell-amount="props">
                  <q-td :props="props" :class="props.row.amount >= 0 ? 'text-green-4' : 'text-red-4'">
                    {{ props.row.amount >= 0 ? '+' : '' }}₦{{ Math.abs(props.row.amount).toLocaleString() }}
                  </q-td>
                </template>
                <template v-slot:body-cell-type="props">
                  <q-td :props="props">
                    <q-chip outline :color="props.row.amount >= 0 ? 'green-4' : 'red-4'" size="xs" dense>
                      {{ props.row.amount >= 0 ? 'CREDIT' : 'DEBIT' }}
                    </q-chip>
                  </q-td>
                </template>
              </q-table>
            </div>
          </div>
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
const wallet = ref({ 
  balance: 0, 
  subAccount: null, 
  virtualAccounts: [], 
  transactions: [] 
})
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
