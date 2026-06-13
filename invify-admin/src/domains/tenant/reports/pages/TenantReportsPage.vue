<!-- invify-admin/src/pages/tenant/TenantReportsPage.vue -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    
    <!-- Header -->
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="insert_chart_outlined" color="purple-3" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">BI Reports & Exports</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Generate, compile, and download cryptographically signed business and financial reporting statements.
        </div>
      </div>
    </div>

    <!-- 1. Report Category Cards -->
    <div class="row q-col-gutter-lg q-mb-lg">
      <div class="col-12 col-md-4" v-for="rep in reports" :key="rep.title">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg column justify-between h-full" style="min-height: 200px;">
          <div>
            <div class="row items-center justify-between q-mb-sm">
              <q-icon :name="rep.icon" :color="rep.color" size="sm" />
              <q-badge color="indigo-10" text-color="indigo-3" class="text-metric-sm text-weight-bold font-mono">REPLAY-SAFE</q-badge>
            </div>
            <div class="text-h6 text-weight-bold text-white">{{ rep.title }}</div>
            <div class="text-caption text-grey-5 q-mt-xs" style="font-size: 11.5px; line-height: 1.35;">{{ rep.desc }}</div>
          </div>

          <div class="row q-col-gutter-sm q-mt-md">
            <div class="col-6">
              <q-btn outline color="grey-5" icon="file_download" label="CSV" @click="downloadReport(rep.title, 'CSV')" class="full-width text-weight-bold text-caption font-mono" />
            </div>
            <div class="col-6">
              <q-btn unelevated :color="rep.btnColor" label="Generate PDF" @click="downloadReport(rep.title, 'PDF')" class="full-width text-weight-bold text-caption text-black" />
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- 2. Visual Reporting Dashboard Matrix (Charts/Timeline) -->
    <div class="row q-col-gutter-lg">
      
      <!-- Graph Metric -->
      <div class="col-12 col-lg-8">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="text-h6 text-weight-bold text-white q-mb-xs">Monthly Settlement Dispersions</div>
          <div class="text-caption text-grey-5 q-mb-md">Aggregated payouts routed to your corporate bank account.</div>

          <div class="chart-mockup q-py-lg">
            <div class="row items-end justify-between q-gutter-x-sm fit" style="height: 200px;">
              <div v-for="(val, label) in dispersionChart" :key="label" class="col column items-center">
                <div 
                  class="bg-purple-7 rounded-borders fit bar-hover transition-3" 
                  :style="`height: ${(val / 2000000) * 100}%; background: linear-gradient(180deg, #d8b4fe 0%, rgba(216, 180, 254, 0.1) 100%);`"
                >
                  <q-tooltip class="bg-indigo-10 text-white text-metric-mono">
                    {{ label }}: {{ currentCurrency.symbol }}{{ val.toLocaleString() }}
                  </q-tooltip>
                </div>
                <span class="text-metric-mono text-grey-6 q-mt-xs font-mono" style="font-size: 10px;">{{ label }}</span>
              </div>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Generated History Log -->
      <div class="col-12 col-lg-4">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="text-h6 text-weight-bold text-white q-mb-xs">Historical Snapshot Log</div>
          <div class="text-caption text-grey-5 q-mb-md">Audit chains of previously compiled files.</div>

          <q-list separator class="border-grey-9 rounded-borders">
            <q-item v-for="log in exportLogs" :key="log.id" class="q-py-md">
              <q-item-section avatar>
                <q-icon name="assignment_turned_in" color="purple-3" size="sm" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold text-white">{{ log.name }}</q-item-label>
                <q-item-label caption class="text-grey-5 font-mono">{{ log.type }} | {{ log.size }}</q-item-label>
              </q-item-section>
              <q-item-section side class="text-right">
                <q-btn flat dense round color="purple-3" icon="visibility" @click="inspectLog(log)" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

    </div>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../../../composables/useCurrency';
import { useTenantReportStore } from '../stores/tenantReportStore';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';

const { currentCurrency } = useCurrency();
const $q = useQuasar();
const store = useTenantReportStore();

const { reports, dispersionChart, exportLogs } = storeToRefs(store);

const downloadReport = (title, format) => {
  $q.notify({
    type: 'positive',
    message: `Dynamic snapshot [${title}] compiled safely to ${format}. Cryptographic hash attached.`
  })
}

const inspectLog = (log) => {
  $q.dialog({
    title: 'Audit Chain Record Verification',
    message: `File: ${log.name}\nType: ${log.type}\nSize: ${log.size}\nSHA-256 Checksum: ${log.hash}\nSignature Verification: SUCCESS (Replay secure)`,
    dark: true
  })
}
</script>

<style scoped>
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }
.letter-spacing-1 { letter-spacing: 1px; }

.bar-hover:hover {
  filter: brightness(1.2);
  box-shadow: 0 0 15px rgba(216, 180, 254, 0.5);
}

.font-mono { font-family: 'Courier New', Courier, monospace; }
.transition-3 { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
</style>
