<template>
  <q-page class="q-pa-md bg-grey-1">
    <div class="row items-center q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-my-none text-primary">QFS Sandbox Dashboard</h1>
        <p class="text-subtitle1 text-grey-7 q-mt-sm">Monitor Quasar Financial Sandbox operations and simulation metrics</p>
      </div>
      <q-space />
      <div class="q-gutter-sm">
        <q-btn icon="key" label="API Keys" color="secondary" outline to="/sandbox/keys" />
        <q-btn icon="code" label="Developer Portal" color="primary" unelevated to="/sandbox/developer-portal" />
      </div>
    </div>

    <!-- Health Metrics -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="glass-card bg-primary text-white" flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-weight-medium text-uppercase text-white-7">Active Test Accounts</div>
            <div class="text-h3 text-weight-bold q-my-sm">
              {{ loading ? '-' : health.totalAccounts }}
            </div>
            <div class="text-caption text-white-8 row items-center">
              <q-icon name="account_balance" class="q-mr-xs" />
              Generated via API
            </div>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="glass-card bg-secondary text-white" flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-weight-medium text-uppercase text-white-7">Total Simulations</div>
            <div class="text-h3 text-weight-bold q-my-sm">
              {{ loading ? '-' : health.totalTransfers }}
            </div>
            <div class="text-caption text-white-8 row items-center">
              <q-icon name="swap_horiz" class="q-mr-xs" />
              Transfers & Payments
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="glass-card bg-negative text-white" flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-weight-medium text-uppercase text-white-7">Failed Webhooks</div>
            <div class="text-h3 text-weight-bold q-my-sm">
              {{ loading ? '-' : health.failedWebhooks }}
            </div>
            <div class="text-caption text-white-8 row items-center">
              <q-icon name="warning" class="q-mr-xs" />
              Requires intervention
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="glass-card bg-info text-white" flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-weight-medium text-uppercase text-white-7">Active API Keys</div>
            <div class="text-h3 text-weight-bold q-my-sm">
              {{ loading ? '-' : health.activeApiKeys }}
            </div>
            <div class="text-caption text-white-8 row items-center">
              <q-icon name="vpn_key" class="q-mr-xs" />
              sk_test_* credentials
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="row q-col-gutter-md">
      <div class="col-12 col-lg-8">
        <q-card flat bordered class="rounded-borders full-height">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6 text-weight-bold text-dark">Recent Failed Webhooks</div>
            <q-space />
            <q-btn flat icon="refresh" color="primary" @click="fetchData" :loading="loading" />
          </q-card-section>

          <q-card-section>
            <q-table
              flat
              :rows="failedWebhooks"
              :columns="webhookColumns"
              row-key="id"
              :loading="loading"
              hide-pagination
              :pagination="{ rowsPerPage: 5 }"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-chip size="sm" color="negative" text-color="white" :label="props.value" />
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="text-right">
                  <q-btn flat round size="sm" icon="replay" color="primary" @click="replayWebhook(props.row.id)">
                    <q-tooltip>Replay Webhook</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
              <template v-slot:no-data>
                <div class="full-width row flex-center text-accent q-pa-md">
                  <q-icon size="2em" name="check_circle" class="q-mr-sm" color="positive" />
                  <span>No failed webhooks! Everything is running smoothly.</span>
                </div>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-4">
        <q-card flat bordered class="rounded-borders full-height">
          <q-card-section>
            <div class="text-h6 text-weight-bold text-dark">Simulation Analytics</div>
            <div class="text-caption text-grey-7">Transfer outcomes by status</div>
          </q-card-section>
          
          <q-card-section v-if="!loading">
             <q-list separator>
               <q-item>
                 <q-item-section avatar>
                   <q-icon name="check_circle" color="positive" />
                 </q-item-section>
                 <q-item-section>Successful</q-item-section>
                 <q-item-section side class="text-weight-bold">{{ analytics.transfers.success }}</q-item-section>
               </q-item>
               <q-item>
                 <q-item-section avatar>
                   <q-icon name="pending" color="warning" />
                 </q-item-section>
                 <q-item-section>Pending</q-item-section>
                 <q-item-section side class="text-weight-bold">{{ analytics.transfers.pending }}</q-item-section>
               </q-item>
               <q-item>
                 <q-item-section avatar>
                   <q-icon name="error" color="negative" />
                 </q-item-section>
                 <q-item-section>Failed</q-item-section>
                 <q-item-section side class="text-weight-bold">{{ analytics.transfers.failed }}</q-item-section>
               </q-item>
               <q-item>
                 <q-item-section avatar>
                   <q-icon name="block" color="grey" />
                 </q-item-section>
                 <q-item-section>Rejected</q-item-section>
                 <q-item-section side class="text-weight-bold">{{ analytics.transfers.rejected }}</q-item-section>
               </q-item>
               <q-item>
                 <q-item-section avatar>
                   <q-icon name="undo" color="info" />
                 </q-item-section>
                 <q-item-section>Reversed</q-item-section>
                 <q-item-section side class="text-weight-bold">{{ analytics.transfers.reversed }}</q-item-section>
               </q-item>
             </q-list>
             
             <div class="q-mt-md q-pa-sm bg-grey-2 rounded-borders text-center">
                <div class="text-caption text-uppercase text-grey-8">Total Simulated Volume</div>
                <div class="text-h5 text-weight-bold text-primary">
                  ₦{{ formatAmount(analytics.transfers.totalVolumeKobo) }}
                </div>
             </div>
          </q-card-section>
          <q-card-section v-else class="flex flex-center" style="min-height: 200px">
            <q-spinner color="primary" size="2em" />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { ref, onMounted } from 'vue'
import { sandboxApi } from 'src/api'
import { useQuasar } from 'quasar'

export default {
  name: 'SandboxDashboardPage',
  setup () {
    const $q = useQuasar()
    const loading = ref(true)
    const health = ref({
      totalAccounts: 0,
      totalTransfers: 0,
      failedWebhooks: 0,
      activeApiKeys: 0
    })
    
    const analytics = ref({
      transfers: { pending: 0, success: 0, failed: 0, reversed: 0, rejected: 0, totalVolumeKobo: 0 }
    })
    
    const failedWebhooks = ref([])
    
    const webhookColumns = [
      { name: 'event_type', label: 'Event', field: 'event_type', align: 'left', sortable: true },
      { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
      { name: 'attempts', label: 'Attempts', field: 'attempts', align: 'center' },
      { name: 'error_message', label: 'Error', field: 'error_message', align: 'left', classes: 'ellipsis', style: 'max-width: 200px' },
      { name: 'actions', label: 'Actions', align: 'right' }
    ]

    const fetchData = async () => {
      loading.value = true
      try {
        const [healthRes, analyticsRes, webhooksRes] = await Promise.all([
          sandboxApi.getHealth(),
          sandboxApi.getAnalytics(),
          sandboxApi.listWebhooks({ status: 'failed', limit: 5 })
        ])
        
        health.value = healthRes.data
        analytics.value = analyticsRes.data
        failedWebhooks.value = webhooksRes.data.webhooks
      } catch (err) {
        console.error('Failed to fetch QFS dashboard data', err)
        $q.notify({ type: 'negative', message: 'Failed to load Sandbox data' })
      } finally {
        loading.value = false
      }
    }

    const replayWebhook = async (id) => {
      try {
        await sandboxApi.replayWebhook(id)
        $q.notify({ type: 'positive', message: 'Webhook replayed successfully' })
        fetchData()
      } catch (err) {
        $q.notify({ type: 'negative', message: 'Failed to replay webhook' })
      }
    }
    
    const formatAmount = (kobo) => {
      if (!kobo) return '0.00'
      return (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    onMounted(() => {
      fetchData()
    })

    return {
      loading,
      health,
      analytics,
      failedWebhooks,
      webhookColumns,
      fetchData,
      replayWebhook,
      formatAmount
    }
  }
}
</script>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
.text-white-7 { color: rgba(255,255,255,0.7); }
.text-white-8 { color: rgba(255,255,255,0.8); }
</style>
