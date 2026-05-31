<!-- invify-admin/src/pages/governance/GovernanceCommandCenter.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-cyan-3 text-uppercase tracking-wider"><q-icon name="admin_panel_settings" class="q-mr-xs"/>Enterprise Governance</div>
          <div class="text-h4 text-main text-weight-bolder" style="line-height: 1.1;">
            Governance Command Center
          </div>
        </div>
      </div>

      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="sm" color="cyan-4" icon="assessment" label="Governance Report" class="text-weight-bold" />
        <q-btn unelevated size="sm" color="cyan-5" text-color="dark" icon="gavel" label="Policy Center" class="text-weight-bold" />
      </div>
    </div>

    <!-- Analytics Dashboard -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-3">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Governance Health Score</div>
          <div class="text-h3 text-metric-mono text-green-4">
            96.8%
          </div>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Operational Efficiency</div>
          <div class="text-h3 text-metric-mono text-cyan-4">99.2%</div>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full text-center cursor-pointer hover-bg">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Pending Approvals</div>
          <div class="text-h4 text-metric-mono text-amber-4">14</div>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full text-center cursor-pointer hover-bg">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Governance Risk Score</div>
          <div class="text-h4 text-metric-mono text-main">Low</div>
        </q-card>
      </div>
    </div>

    <!-- Hub Cards -->
    <div class="row q-col-gutter-md col">
      <!-- Left Column: Operations -->
      <div class="col-12 col-md-8 column op-gap-16">
        
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-md h-full column">
              <div class="row items-center op-gap-8 q-mb-md border-bottom q-pb-sm">
                <q-icon name="verified" color="purple-4" size="sm" />
                <div class="text-h6 font-mono text-main">Approval Engine</div>
              </div>
              <div class="col column op-gap-12">
                <div class="row justify-between text-caption font-mono border-bottom q-pb-sm">
                  <span class="text-muted">Avg Wait Time</span>
                  <span class="text-main">1.2 Hrs</span>
                </div>
                <div class="row justify-between text-caption font-mono border-bottom q-pb-sm">
                  <span class="text-muted">Rejection Rate</span>
                  <span class="text-amber-4">4%</span>
                </div>
                <div class="row justify-between text-caption font-mono">
                  <span class="text-muted">Total Processed (24h)</span>
                  <span class="text-main">314</span>
                </div>
              </div>
              <q-btn flat color="purple-4" label="Go to Approvals" class="full-width q-mt-md font-mono" to="/governance/approvals" />
            </q-card>
          </div>
          
          <div class="col-12 col-md-6">
            <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-md h-full column">
              <div class="row items-center op-gap-8 q-mb-md border-bottom q-pb-sm">
                <q-icon name="account_tree" color="indigo-4" size="sm" />
                <div class="text-h6 font-mono text-main">Workflow Automation</div>
              </div>
              <div class="col column op-gap-12">
                <div class="row justify-between text-caption font-mono border-bottom q-pb-sm">
                  <span class="text-muted">Active Pipelines</span>
                  <span class="text-main">24</span>
                </div>
                <div class="row justify-between text-caption font-mono border-bottom q-pb-sm">
                  <span class="text-muted">Execution Success</span>
                  <span class="text-green-4">100%</span>
                </div>
                <div class="row justify-between text-caption font-mono">
                  <span class="text-muted">Time Saved (Est)</span>
                  <span class="text-cyan-4">42 Hrs</span>
                </div>
              </div>
              <q-btn flat color="indigo-4" label="Go to Workflows" class="full-width q-mt-md font-mono" to="/automation/workflows" />
            </q-card>
          </div>
        </div>

        <div class="row q-col-gutter-md col">
          <div class="col-12 col-md-6">
            <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-md h-full column">
              <div class="row items-center op-gap-8 q-mb-md border-bottom q-pb-sm">
                <q-icon name="timer" color="pink-4" size="sm" />
                <div class="text-h6 font-mono text-main">SLA Management</div>
              </div>
              <div class="col column op-gap-12">
                <div class="row justify-between text-caption font-mono border-bottom q-pb-sm">
                  <span class="text-muted">Compliance Target</span>
                  <span class="text-main">98.5%</span>
                </div>
                <div class="row justify-between text-caption font-mono border-bottom q-pb-sm">
                  <span class="text-muted">Breached Policies</span>
                  <span class="text-red-4">2</span>
                </div>
                <div class="row justify-between text-caption font-mono">
                  <span class="text-muted">Escalations</span>
                  <span class="text-amber-4">8</span>
                </div>
              </div>
              <q-btn flat color="pink-4" label="Go to SLAs" class="full-width q-mt-md font-mono" to="/governance/sla" />
            </q-card>
          </div>

          <div class="col-12 col-md-6">
            <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-md h-full column">
              <div class="row items-center op-gap-8 q-mb-md border-bottom q-pb-sm">
                <q-icon name="notifications_active" color="amber-4" size="sm" />
                <div class="text-h6 font-mono text-main">Global Notifications</div>
              </div>
              <div class="col column op-gap-12">
                <div class="row justify-between text-caption font-mono border-bottom q-pb-sm">
                  <span class="text-muted">Dispatches (24h)</span>
                  <span class="text-main">4,192</span>
                </div>
                <div class="row justify-between text-caption font-mono border-bottom q-pb-sm">
                  <span class="text-muted">Read Rate</span>
                  <span class="text-main">94%</span>
                </div>
                <div class="row justify-between text-caption font-mono">
                  <span class="text-muted">Critical Pending</span>
                  <span class="text-amber-4">12</span>
                </div>
              </div>
              <q-btn flat color="amber-4" label="View Notifications" class="full-width q-mt-md font-mono" />
            </q-card>
          </div>
        </div>

      </div>

      <!-- Right Column: Compliance & AI Intelligence -->
      <div class="col-12 col-md-4 column op-gap-16">
        
        <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-md">
          <div class="row items-center op-gap-8 q-mb-md border-bottom q-pb-sm">
            <q-icon name="policy" color="cyan-4" size="sm" />
            <div class="text-h6 font-mono text-main">Policy & Quarantine</div>
          </div>
          <div class="column op-gap-12">
            <div class="row justify-between items-center text-caption font-mono border-bottom q-pb-sm cursor-pointer hover-bg" @click="$router.push('/governance/policy')">
              <span class="text-muted">Global Policies</span>
              <span class="text-main">18 Active <q-icon name="arrow_forward"/></span>
            </div>
            <div class="row justify-between items-center text-caption font-mono border-bottom q-pb-sm cursor-pointer hover-bg" @click="$router.push('/governance/quarantine')">
              <span class="text-muted">Quarantine Center</span>
              <span class="text-red-4">3 Entities <q-icon name="arrow_forward"/></span>
            </div>
            <div class="row justify-between items-center text-caption font-mono cursor-pointer hover-bg" @click="$router.push('/governance/drift')">
              <span class="text-muted">Drift Analysis</span>
              <span class="text-main">0% Drift <q-icon name="arrow_forward"/></span>
            </div>
          </div>
        </q-card>

        <q-card flat class="bg-dark border-muted rounded-borders q-pa-md col">
          <div class="row items-center op-gap-8 q-mb-md border-bottom q-pb-sm">
            <q-icon name="smart_toy" color="indigo-4" size="sm" />
            <div class="text-h6 font-mono text-main">AI Governance Intel</div>
          </div>
          
          <div class="column op-gap-12 font-mono text-caption">
            <div class="row items-start op-gap-8 q-mb-sm">
              <q-icon name="insights" color="cyan-4" class="q-mt-xs" />
              <div class="col text-muted">
                <span class="text-main text-weight-bold">Policy Gap Detected:</span> AI indicates high manual override rate on Tier 2 KYC. Recommended automated workflow creation.
              </div>
            </div>
            <div class="row items-start op-gap-8 q-mb-sm">
              <q-icon name="insights" color="purple-4" class="q-mt-xs" />
              <div class="col text-muted">
                <span class="text-main text-weight-bold">SLA Optimization:</span> Settlement Team consistently beats SLA targets by 40%. Consider tightening target windows.
              </div>
            </div>
            <div class="row items-start op-gap-8">
              <q-icon name="warning" color="amber-4" class="q-mt-xs" />
              <div class="col text-muted">
                <span class="text-main text-weight-bold">Approval Bottleneck:</span> Compliance Approver queue is growing. AI predicts an SLA breach within 4 hours if not reassigned.
              </div>
            </div>
          </div>
          
          <q-btn outline color="indigo-4" label="Generate Board Report" class="full-width q-mt-auto font-mono text-caption" />
        </q-card>
        
      </div>
    </div>
  </q-page>
</template>

<script setup>
// Hub component acting as central routing for governance functions.
</script>

<style scoped>
.bg-panel { background: var(--sidebar-panel-bg); }
.bg-subpanel { background: rgba(0, 0, 0, 0.2); }
.bg-dark { background: rgba(0, 0, 0, 0.4); }
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }
.text-main { color: var(--enterprise-text-main); }
.text-muted { color: var(--enterprise-text-muted); }
.op-gap-8 { gap: 8px; }
.op-gap-12 { gap: 12px; }
.op-gap-16 { gap: 16px; }
.hover-bg:hover { background: rgba(255,255,255,0.05); }
</style>
