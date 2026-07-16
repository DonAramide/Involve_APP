<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">AI Center</div>

    <q-card>
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">AI Providers</div>
        <div>
          <q-btn flat icon="refresh" @click="fetchData" :loading="loading" />
        </div>
      </q-card-section>

      <q-card-section class="text-center q-pa-xl text-grey">
        <q-icon name="smart_toy" size="64px" color="grey-4" />
        <div class="text-h6 q-mt-md">No AI providers configured.</div>
        <div class="q-mb-md">Connect an AI provider to enable intelligent automation features.</div>
        
        <div class="row justify-center q-gutter-md">
          <q-btn outline color="primary" label="Connect OpenAI" icon="auto_awesome" />
          <q-btn outline color="primary" label="Connect Anthropic" icon="auto_awesome" />
          <q-btn outline color="primary" label="Connect Gemini" icon="auto_awesome" />
        </div>
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
    const response = await fetch('/api/v1/ai/dashboard', {
      headers: { Authorization: `Bearer ${localStorage.getItem('supabase_token')}` }
    });
    
    if (response.ok) {
      data.value = await response.json();
    } else {
      data.value = null;
    }
  } catch (error) {
    logger.error('Failed to fetch AI data:', error);
    data.value = null;
  } finally {
    loading.value = false;
  }
};

onMounted(() => fetchData());
</script>
