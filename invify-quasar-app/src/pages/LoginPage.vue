<template>
  <q-page class="flex flex-center">
    <q-card style="width: 400px; max-width: 90vw;">
      <q-card-section>
        <div class="text-h6">Login</div>
      </q-card-section>
      <q-card-section>
        <q-input v-model="email" label="Email" type="email" />
        <q-input v-model="password" label="Password" type="password" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn color="primary" label="Sign In" @click="login" :loading="loading" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const email = ref('');
const password = ref('');
const loading = ref(false);

const login = async () => {
  loading.value = true;
  // TODO: Supabase Auth integration goes here
  setTimeout(() => { loading.value = false; }, 1000);
};
</script>
