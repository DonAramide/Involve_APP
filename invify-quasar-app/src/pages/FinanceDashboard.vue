<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">Finance Dashboard</div>
    
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Revenue</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.revenue : '$0.00' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Today's Settlements</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.settlements : '0' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Outstanding Reconciliation</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.reconciliation : '0' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 text-grey">Wallet Balance</div>
            <div class="text-h5" v-if="!loading">{{ data ? data.walletBalance : '$0.00' }}</div>
            <q-skeleton v-else type="text" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card>
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">Latest Transactions</div>
        <div>
          <q-btn flat icon="refresh" @click="fetchData" :loading="loading" />
          <q-btn outline label="Export" class="q-ml-sm" :disable="loading || !transactions.length" />
        </div>
      </q-card-section>
      
      <q-markup-table v-if="transactions.length > 0">
        <thead>
          <tr>
            <th class="text-left">Date</th>
            <th class="text-left">Description</th>
            <th class="text-right">Amount</th>
            <th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in transactions" :key="tx.id">
            <td class="text-left">{{ tx.date }}</td>
            <td class="text-left">{{ tx.description }}</td>
            <td class="text-right">{{ tx.amount }}</td>
            <td class="text-center"><q-badge :color="tx.statusColor">{{ tx.status }}</q-badge></td>
          </tr>
        </tbody>
      </q-markup-table>

      <q-card-section v-else class="text-center q-pa-xl text-grey">
        <q-icon name="receipt_long" size="64px" color="grey-4" />
        <div class="text-h6 q-mt-md">No Financial Records Yet</div>
        <div>Transactions will appear here once activity begins.</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { logger } from '../services/logger';

const loading = ref(true);
const data = ref<any>(null);
const transactions = ref<any[]>([]);

const fetchData = async () => {
  loading.value = true;
  try {
    // Attempting to fetch from real API, defaulting to empty state
    const response = await fetch('/api/v1/finance/dashboard', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('supabase_token')}` // use real token
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      data.value = result.summary;
      transactions.value = result.transactions;
    } else {
      // Intentionally falling back to empty state when no real data exists
      data.value = null;
      transactions.value = [];
    }
  } catch (error) {
    logger.error('Failed to fetch finance dashboard data:', error);
    data.value = null;
    transactions.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>
