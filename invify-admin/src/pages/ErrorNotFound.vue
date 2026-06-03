<template>
  <div class="fullscreen bg-blue text-white text-center q-pa-md flex flex-center">
    <div>
      <div style="font-size: 30vh">
        404
      </div>

      <div class="text-h2" style="opacity:.4">
        Oops. Nothing here...
      </div>

      <q-btn
        class="q-mt-xl"
        color="white"
        text-color="blue"
        unelevated
        @click="goHome"
        label="Go Home"
        no-caps
      />
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const goHome = () => {
  if (route.path.startsWith('/agent')) {
    router.push('/agent/login')
  } else if (route.path.startsWith('/tenant')) {
    router.push('/tenant/dashboard')
  } else {
    router.push('/login')
  }
}
</script>
