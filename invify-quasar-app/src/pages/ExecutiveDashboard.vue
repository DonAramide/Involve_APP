<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">Executive Overview</div>
    
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-4">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Total Revenue</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.revenue : '$0.00' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Active Tenants</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.tenants : '0' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Registered Devices</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.devices : '0' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Total Users</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.users : '0' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">M/M Growth</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.growth : '0%' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card>
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">Global Platform Activity</div>
        <div>
          <q-btn flat icon="refresh" @click="fetchData" :loading="loading" />
        </div>
      </q-card-section>

      <q-card-section class="text-center q-pa-xl text-grey">
        <q-icon name="insights" size="64px" color="grey-4" />
        <div class="text-h6 q-mt-md">Awaiting Executive Data</div>
        <div>Activity graphs and trends will populate here once transactions begin.</div>
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
    const response = await fetch('/api/v1/executive/dashboard', {
      headers: { Authorization: `Bearer ${localStorage.getItem('supabase_token')}` }
    });
    
    if (response.ok) {
      data.value = await response.json();
    } else {
      data.value = null;
    }
  } catch (error) {
    logger.error('Failed to fetch executive data:', error);
    data.value = null;
  } finally {
    loading.value = false;
  }
};

onMounted(() => fetchData());
</script>
