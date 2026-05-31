<!-- invify-admin/src/pages/finance/GlobalReconciliationPage.vue -->
<template>
  <q-page class="q-pa-lg text-white relative-position" style="background: var(--enterprise-page-bg); min-height: 100vh;">
    <SecureFinanceGate>
      
      <!-- Top Header -->
      <div class="row items-center justify-between q-mb-xl">
        <div class="row items-center op-gap-8 no-wrap">
          <div class="bg-amber-10 q-pa-sm rounded-borders border-amber-left flex flex-center">
            <q-icon name="account_balance" color="amber-2" size="md" />
          </div>
          <div>
            <div class="row items-center op-gap-4">
              <div class="text-operator-title text-main text-weight-bold" style="font-size: 16px;">Global Reconciliation & Audit</div>
              <q-chip dense size="xs" color="amber-10" text-color="amber-2" class="text-weight-bold">RESTRICTED</q-chip>
            </div>
            <div class="text-caption text-muted q-mt-xs" style="font-size: 11px;">
              System-wide cross-tenant clearing, card networks, and parent-to-student volume reconciliation.
            </div>
          </div>
        </div>

        <div class="row items-center op-gap-4">
          <div class="enterprise-subpanel q-px-md q-py-xs rounded-borders text-right border-muted">
            <div class="text-metric-mono text-grey-5" style="font-size: 10px;">GLOBAL VOLUME 24H</div>
            <div class="text-metric-mono text-white text-weight-bold" style="font-size: 14px;">₦ 842.5M</div>
          </div>
          <q-btn unelevated color="amber-5" text-color="black" icon="sync" label="Force Ledger Sync" class="text-weight-bold text-caption" />
        </div>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="row q-col-gutter-lg">
        
        <!-- Left Column: System Volumes & Escrows -->
        <div class="col-12 col-md-5 column op-gap-16">
          
          <!-- System Volume: Card vs Transfer -->
          <div class="enterprise-panel bg-panel rounded-borders column no-shadow border-muted flex-grow-1">
            <div class="panel-header bg-subpanel q-px-md q-py-sm border-bottom row items-center justify-between">
              <div class="row items-center op-gap-4 text-operator-title text-main">
                <q-icon name="donut_large" size="xs" color="cyan-3" />
                <span>Overall System Volume</span>
              </div>
            </div>
            <div class="panel-body q-pa-md">
              <div class="row items-end justify-between q-mb-md">
                <div>
                  <div class="text-metric-mono text-cyan-3" style="font-size: 20px;">₦ 520.1M</div>
                  <div class="text-caption text-muted" style="font-size: 10px;">Card Networks (61%)</div>
                </div>
                <div class="text-right">
                  <div class="text-metric-mono text-purple-3" style="font-size: 20px;">₦ 322.4M</div>
                  <div class="text-caption text-muted" style="font-size: 10px;">In-App Transfers (39%)</div>
                </div>
              </div>
              
              <!-- Visual Bar Chart -->
              <div class="row no-wrap full-width rounded-borders overflow-hidden" style="height: 24px;">
                <div class="bg-cyan-5" style="width: 61%;"></div>
                <div class="bg-purple-5" style="width: 39%;"></div>
              </div>
              
              <div class="q-mt-lg row items-center justify-between text-metric-sm text-grey-5">
                <div class="row items-center op-gap-4"><div class="rounded-borders bg-cyan-5" style="width:8px;height:8px;"></div> POS Terminals & Online Gateways</div>
                <div class="row items-center op-gap-4"><div class="rounded-borders bg-purple-5" style="width:8px;height:8px;"></div> Parent Wallet to Student ID</div>
              </div>
            </div>
          </div>

          <!-- Payout Escrow Balances -->
          <div class="enterprise-panel bg-panel rounded-borders column no-shadow border-muted flex-grow-1">
            <div class="panel-header bg-subpanel q-px-md q-py-sm border-bottom row items-center justify-between">
              <div class="row items-center op-gap-4 text-operator-title text-main">
                <q-icon name="payments" size="xs" color="green-4" />
                <span>Pending Payout Escrows</span>
              </div>
              <span class="text-metric-mono text-green-4" style="font-size: 10px;">12 TENANTS</span>
            </div>
            <div class="panel-body q-pa-xs">
              <q-list dense>
                <q-item class="q-px-md q-py-sm border-bottom hover-row">
                  <q-item-section>
                    <q-item-label class="text-main text-weight-bold text-caption">Alpha Retail Chain</q-item-label>
                    <q-item-label class="text-muted" style="font-size: 10px;">T+1 Settlement Wait</q-item-label>
                  </q-item-section>
                  <q-item-section side class="text-right">
                    <div class="text-metric-mono text-green-3">₦ 142.5M</div>
                    <div class="text-metric-sm text-grey-6">Due 14:00 GMT</div>
                  </q-item-section>
                </q-item>
                <q-item class="q-px-md q-py-sm border-bottom hover-row">
                  <q-item-section>
                    <q-item-label class="text-main text-weight-bold text-caption">Logistics Prime</q-item-label>
                    <q-item-label class="text-muted" style="font-size: 10px;">T+0 Instant Disburse</q-item-label>
                  </q-item-section>
                  <q-item-section side class="text-right">
                    <div class="text-metric-mono text-green-3">₦ 89.2M</div>
                    <div class="text-metric-sm text-grey-6">Processing...</div>
                  </q-item-section>
                </q-item>
                <q-item class="q-px-md q-py-sm hover-row">
                  <q-item-section>
                    <q-item-label class="text-main text-weight-bold text-caption">EduCore Schools</q-item-label>
                    <q-item-label class="text-muted" style="font-size: 10px;">Wallet Reconciled</q-item-label>
                  </q-item-section>
                  <q-item-section side class="text-right">
                    <div class="text-metric-mono text-green-3">₦ 41.0M</div>
                    <div class="text-metric-sm text-grey-6">Due 17:00 GMT</div>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </div>

        <!-- Right Column: Discrepancy Matrix -->
        <div class="col-12 col-md-7 column">
          <div class="enterprise-panel bg-panel rounded-borders column fit no-shadow border-muted">
            <div class="panel-header bg-subpanel q-px-md q-py-sm border-bottom row items-center justify-between">
              <div class="row items-center op-gap-4 text-operator-title text-main">
                <q-icon name="gpp_maybe" size="xs" color="red-4" />
                <span>Global Anomaly & Discrepancy Matrix</span>
              </div>
              <q-btn flat dense color="amber-4" size="sm" label="View All Flags" />
            </div>
            
            <div class="panel-body q-pa-sm">
              <q-table
                :rows="discrepancies"
                :columns="columns"
                row-key="id"
                flat
                dark
                bordered
                class="bg-transparent"
                hide-bottom
                :pagination="{ rowsPerPage: 10 }"
              >
                <template v-slot:body-cell-severity="props">
                  <q-td :props="props">
                    <q-badge :color="props.value === 'CRITICAL' ? 'deep-orange-10' : 'amber-10'" :text-color="props.value === 'CRITICAL' ? 'deep-orange-2' : 'amber-2'" class="text-weight-bold text-metric-sm">
                      {{ props.value }}
                    </q-badge>
                  </q-td>
                </template>
                <template v-slot:body-cell-delta="props">
                  <q-td :props="props" class="text-metric-mono text-red-4 font-mono text-weight-bold">
                    {{ props.value }}
                  </q-td>
                </template>
                <template v-slot:body-cell-action="props">
                  <q-td :props="props" class="text-right">
                    <q-btn dense size="xs" color="blue-grey-8" text-color="grey-3" label="Audit Trace" class="q-px-sm" />
                  </q-td>
                </template>
              </q-table>
            </div>
          </div>
        </div>
        
      </div>
    </SecureFinanceGate>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import SecureFinanceGate from '../../components/finance/SecureFinanceGate.vue'

const columns = [
  { name: 'tenant', label: 'TENANT / SCOPE', field: 'tenant', align: 'left', style: 'font-size: 11px;' },
  { name: 'type', label: 'EXCEPTION TYPE', field: 'type', align: 'left', style: 'font-size: 11px;' },
  { name: 'severity', label: 'SEVERITY', field: 'severity', align: 'center' },
  { name: 'delta', label: 'FINANCIAL DELTA', field: 'delta', align: 'right' },
  { name: 'action', label: '', align: 'right' }
]

const discrepancies = ref([
  { id: 1, tenant: 'Alpha Retail Chain', type: 'POS Double-Spend Rejection', severity: 'CRITICAL', delta: '₦ 14,500' },
  { id: 2, tenant: 'Global Network', type: 'Orphaned Gateway Callback', severity: 'HIGH', delta: '₦ 1,200,000' },
  { id: 3, tenant: 'EduCore Schools', type: 'Unmatched Parent Transfer', severity: 'CRITICAL', delta: '₦ 42,000' },
  { id: 4, tenant: 'Logistics Prime', type: 'Terminal Batch Desync', severity: 'HIGH', delta: '₦ 8,400' },
  { id: 5, tenant: 'Global Network', type: 'Provider Settlement Lag', severity: 'HIGH', delta: '₦ 4,500,000' }
])
</script>

<style scoped>
.font-mono { font-family: 'Courier New', Courier, monospace; }
.border-amber-left { border-left: 3px solid var(--q-amber-5); }
.border-muted { border: 1px solid var(--enterprise-border); }
</style>
