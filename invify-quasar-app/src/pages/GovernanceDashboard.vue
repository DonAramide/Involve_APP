<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">Governance</div>
    
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Audit Events</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.auditEvents : '0' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Policy Changes</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.policyChanges : '0' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Role Assignments</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.roles : '0' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Security Events</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.securityEvents : '0' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card>
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">Compliance Logs</div>
        <div>
          <q-btn flat icon="refresh" @click="fetchData" :loading="loading" />
        </div>
      </q-card-section>

      <q-card-section class="text-center q-pa-xl text-grey">
        <q-icon name="gavel" size="64px" color="grey-4" />
        <div class="text-h6 q-mt-md">No events recorded.</div>
        <div>System audit trails will be populated here.</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { logger } from '../services/logger';

const loading = ref(true);
const data = ref<any>(null);

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await fetch('/api/v1/governance/dashboard', {
      headers: { Authorization: `Bearer ${localStorage.getItem('supabase_token')}` }
    });
    
    if (response.ok) {
      data.value = await response.json();
    } else {
      data.value = null;
    }
  } catch (error) {
    logger.error('Failed to fetch governance data:', error);
    data.value = null;
  } finally {
    loading.value = false;
  }
};

onMounted(() => fetchData());
</script>
