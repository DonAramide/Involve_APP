<template>
  <q-page padding class="q-pa-lg">
    <div class="row items-center q-mb-xl">
      <div>
        <h4 class="text-h4 text-weight-bold q-my-none">Agent Governance Center</h4>
        <div class="text-subtitle1 text-grey-7">Enterprise Distribution & Commission Orchestration Command</div>
      </div>
      <q-space />
      <q-btn
        color="primary"
        icon="add"
        label="Create Agent"
        @click="showCreateAgentDialog = true"
        unelevated
      />
    </div>

    <!-- Agent Analytics Heatmaps & Key Metrics -->
    <div class="row q-col-gutter-lg q-mb-xl">
      <div class="col-12 col-md-3">
        <q-card flat bordered class="bg-primary text-white">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold text-uppercase opacity-70">Total Active Agents</div>
            <div class="text-h3 text-weight-bold q-mt-sm">1,248</div>
            <div class="text-caption q-mt-sm row items-center">
              <q-icon name="trending_up" class="q-mr-xs" />
              +12% this month
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold text-uppercase text-grey-7">Onboarded Businesses</div>
            <div class="text-h3 text-weight-bold text-dark q-mt-sm">45.2K</div>
            <div class="text-caption text-positive q-mt-sm row items-center">
              <q-icon name="trending_up" class="q-mr-xs" />
              +3.5K new tenants
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold text-uppercase text-grey-7">Pending Payouts</div>
            <div class="text-h3 text-weight-bold text-dark q-mt-sm">$84,500</div>
            <div class="text-caption text-warning q-mt-sm row items-center">
              <q-icon name="schedule" class="q-mr-xs" />
              Settlement in 2 days
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card flat bordered class="bg-negative text-white">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold text-uppercase opacity-70">Fraud / Velocity Alerts</div>
            <div class="text-h3 text-weight-bold q-mt-sm">12</div>
            <div class="text-caption q-mt-sm row items-center">
              <q-icon name="warning" class="q-mr-xs" />
              Requires immediate review
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Main Tabs -->
    <q-card flat bordered>
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-tab name="agents" label="Agent Directory" />
        <q-tab name="heatmaps" label="Regional Heatmaps" />
        <q-tab name="commissions" label="Commission Simulator" />
        <q-tab name="fraud" label="Integrity & Fraud" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <!-- Agent Directory -->
        <q-tab-panel name="agents" class="q-pa-none">
          <q-table
            :rows="agentList"
            :columns="agentColumns"
            row-key="agentCode"
            flat
            :pagination="{ rowsPerPage: 10 }"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip
                  :color="getStatusColor(props.value)"
                  text-color="white"
                  dense
                  size="sm"
                  class="text-weight-bold"
                >
                  {{ props.value }}
                </q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-trustScore="props">
              <q-td :props="props">
                <q-linear-progress
                  :value="props.value / 100"
                  :color="props.value > 80 ? 'positive' : (props.value > 50 ? 'warning' : 'negative')"
                  class="q-mt-md"
                />
                <div class="text-caption text-center">{{ props.value }} / 100</div>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="text-right">
                <q-btn flat round color="primary" icon="visibility" size="sm" />
                <q-btn flat round color="negative" icon="block" size="sm" @click="suspendAgent(props.row.agentCode)" />
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Regional Heatmaps Placeholder -->
        <q-tab-panel name="heatmaps">
          <div class="text-h6 q-mb-md">Regional Onboarding Density</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-card flat bordered class="q-pa-md bg-grey-1 text-center" style="height: 300px;">
                <q-icon name="map" size="100px" color="grey-4" />
                <div class="text-grey-6 text-h6 q-mt-md">Map Visualization</div>
                <div class="text-caption text-grey-5">Integration with GeoJSON/Mapbox pending</div>
              </q-card>
            </div>
            <div class="col-12 col-md-6">
              <q-list bordered separator>
                <q-item v-for="region in heatmapData" :key="region.name">
                  <q-item-section>
                    <q-item-label class="text-weight-bold">{{ region.name }}</q-item-label>
                    <q-item-label caption>Saturation Index: {{ region.saturation }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-chip :color="region.density > 80 ? 'primary' : 'secondary'" text-color="white" dense>
                      {{ region.density }}% Density
                    </q-chip>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </q-tab-panel>

        <!-- Commission Simulator Placeholder -->
        <q-tab-panel name="commissions">
          <div class="text-h6 q-mb-md">Deterministic Commission Replay Simulator</div>
          <q-banner rounded class="bg-grey-2 q-mb-md">
            Simulate commission payouts based on immutable historical snapshots to verify rollback safety.
          </q-banner>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-input outlined dense v-model="simTransaction" label="Transaction Amount (USD)" type="number" />
            </div>
            <div class="col-12 col-md-4">
              <q-select outlined dense v-model="simSnapshot" :options="['v1 (5%)', 'v2 (10%)', 'v3 (Flat $50)', 'v4 (Hybrid)']" label="Select Snapshot Version" />
            </div>
            <div class="col-12 col-md-4">
              <q-btn color="primary" label="Simulate Replay" class="full-width h-full" @click="simulateCommission" />
            </div>
          </div>
          <div v-if="simResult" class="q-mt-lg p-md bg-green-1 border border-green text-green-9 q-pa-md rounded-borders">
            <strong>Simulation Result:</strong> {{ simResult }}
          </div>
        </q-tab-panel>

        <!-- Fraud Alerts Placeholder -->
        <q-tab-panel name="fraud">
          <div class="text-h6 q-mb-md">Integrity Guardian Alerts</div>
          <q-list bordered separator>
            <q-item>
              <q-item-section avatar>
                <q-icon name="warning" color="negative" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Velocity Anomaly: Agent RET102</q-item-label>
                <q-item-label caption>60 onboardings detected within 1 hour (Limit: 50).</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn outline color="primary" label="Review Lineage" size="sm" />
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar>
                <q-icon name="public" color="warning" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Geo Inconsistency: Agent SCH204</q-item-label>
                <q-item-label caption>Onboarding sequence triggered from Lagos then London within 5 minutes.</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn outline color="primary" label="Review Lineage" size="sm" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Create Agent Dialog -->
    <q-dialog v-model="showCreateAgentDialog">
      <q-card style="width: 500px; max-width: 80vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Provision New Agent</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-input outlined dense v-model="newAgent.businessIdentity" label="Business Identity" class="q-mb-md" />
          <q-select outlined dense v-model="newAgent.sector" :options="['Retail', 'Education', 'POS', 'Finance']" label="Operational Sector" class="q-mb-md" />
          <q-input outlined dense v-model="newAgent.prefix" label="Requested Prefix (Optional, e.g. RET)" class="q-mb-md" hint="Will be auto-generated if left blank." />
          <q-select outlined dense v-model="newAgent.commissionProfile" :options="['Standard (v4)', 'Premium (v4)', 'Enterprise Hybrid']" label="Commission Profile" class="q-mb-md" />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn color="primary" label="Provision Agent" @click="provisionAgent" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref } from 'vue';

const activeTab = ref('agents');
const showCreateAgentDialog = ref(false);

const simTransaction = ref(500);
const simSnapshot = ref('v4 (Hybrid)');
const simResult = ref(null);

const newAgent = ref({
  businessIdentity: '',
  sector: '',
  prefix: '',
  commissionProfile: ''
});

const heatmapData = ref([
  { name: 'Lagos Zone', density: 92, saturation: 0.85 },
  { name: 'Nairobi Hub', density: 75, saturation: 0.60 },
  { name: 'Abuja Sector', density: 45, saturation: 0.35 },
]);

const agentColumns = [
  { name: 'agentCode', required: true, label: 'Agent Code', align: 'left', field: 'agentCode', sortable: true },
  { name: 'identity', label: 'Business Identity', align: 'left', field: 'identity', sortable: true },
  { name: 'sector', label: 'Sector', align: 'left', field: 'sector' },
  { name: 'status', label: 'State', align: 'center', field: 'status' },
  { name: 'tenants', label: 'Active Tenants', align: 'right', field: 'tenants', sortable: true },
  { name: 'trustScore', label: 'Trust Score', align: 'center', field: 'trustScore', sortable: true },
  { name: 'actions', label: 'Actions', align: 'right' },
];

const agentList = ref([
  { agentCode: 'AAA000', identity: 'Invify Master Network', sector: 'System', status: 'ACTIVE', tenants: 12450, trustScore: 100 },
  { agentCode: 'RET102', identity: 'Lagos Retail Distro', sector: 'Retail', status: 'ACTIVE', tenants: 342, trustScore: 92 },
  { agentCode: 'SCH204', identity: 'EduTech Partners', sector: 'Education', status: 'PENDING_APPROVAL', tenants: 0, trustScore: 85 },
  { agentCode: 'FIN888', identity: 'FinServe Agency', sector: 'Finance', status: 'SUSPENDED', tenants: 12, trustScore: 40 },
]);

function getStatusColor(status) {
  switch (status) {
    case 'ACTIVE': return 'positive';
    case 'PENDING_APPROVAL': return 'warning';
    case 'SUSPENDED':
    case 'BLOCKED': return 'negative';
    default: return 'grey';
  }
}

function suspendAgent(code) {
  if (confirm(`Are you sure you want to suspend agent ${code}?`)) {
    const agent = agentList.value.find(a => a.agentCode === code);
    if (agent) agent.status = 'SUSPENDED';
  }
}

function simulateCommission() {
  // Mock logic
  simResult.value = `Deterministic Replay Successful. Reconstructed payout amount: $${(simTransaction.value * 0.1).toFixed(2)} based on snapshot ${simSnapshot.value}`;
}

function provisionAgent() {
  const prefix = newAgent.value.prefix || 'AGN';
  const newCode = `${prefix.substring(0,3).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
  agentList.value.unshift({
    agentCode: newCode,
    identity: newAgent.value.businessIdentity,
    sector: newAgent.value.sector,
    status: 'ACTIVE',
    tenants: 0,
    trustScore: 100
  });
  showCreateAgentDialog.value = false;
  newAgent.value = { businessIdentity: '', sector: '', prefix: '', commissionProfile: '' };
}
</script>
