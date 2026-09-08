<template>
  <InvifyLoadingState fullscreen :message="message" />
</template>

<script setup>
import InvifyLoadingState from './InvifyLoadingState.vue'

defineProps({
  message: {
    type: String,
    default: 'LOADING INVIFY...',
  },
})
</script>
