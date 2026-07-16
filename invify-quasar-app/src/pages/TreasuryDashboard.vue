<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">Treasury Center</div>
    
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Bank Accounts</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.accounts : '0' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Settlement Queue</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.queue : '0' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Reserve Accounts</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.reserves : '$0.00' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Liquidity</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.liquidity : 'N/A' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card>
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">Treasury Operations</div>
        <div>
          <q-btn flat icon="refresh" @click="fetchData" :loading="loading" />
        </div>
      </q-card-section>

      <q-card-section class="text-center q-pa-xl text-grey">
        <q-icon name="account_balance" size="64px" color="grey-4" />
        <div class="text-h6 q-mt-md">No Records Found</div>
        <div>Treasury activity will appear here once connected to clearing banks.</div>
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
    const response = await fetch('/api/v1/treasury/dashboard', {
      headers: { Authorization: `Bearer ${localStorage.getItem('supabase_token')}` }
    });
    
    if (response.ok) {
      data.value = await response.json();
    } else {
      data.value = null;
    }
  } catch (error) {
    logger.error('Failed to fetch treasury dashboard data:', error);
    data.value = null;
  } finally {
    loading.value = false;
  }
};

onMounted(() => fetchData());
</script>
