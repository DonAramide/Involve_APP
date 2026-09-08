<template>
  <div class="invify-loading" :class="{ 'invify-loading--fullscreen': fullscreen }" role="status" aria-live="polite">
    <div class="invify-loading__mark">
      <div class="invify-loading__ring" />
      <div class="invify-loading__badge">
        <img :src="logoSrc" alt="Invify" class="invify-loading__logo" />
      </div>
    </div>
    <div class="invify-loading__message">{{ message }}</div>
  </div>
</template>

<script setup>
import logoSrc from '../assets/logo_transparent.png'

defineProps({
  message: {
    type: String,
    default: 'LOADING INVIFY...',
  },
  fullscreen: {
    type: Boolean,
    default: false,
  },
})
</script>

<style scoped>
.invify-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  width: 100%;
  gap: 24px;
  color: rgba(255, 255, 255, 0.72);
  position: relative;
  z-index: 2;
}

.invify-loading--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  min-height: 100vh;
  background: #05070d;
}

.invify-loading__mark {
  width: 90px;
  height: 90px;
  position: relative;
  display: grid;
  place-items: center;
  animation: invify-pulse 1.2s ease-in-out infinite alternate;
  filter: drop-shadow(0 0 18px rgba(99, 102, 241, 0.35));
}

.invify-loading__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid rgba(99, 102, 241, 0.15);
  border-top-color: #6366f1;
  animation: invify-spin 1s linear infinite;
}

.invify-loading__badge {
  width: 65px;
  height: 65px;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.invify-loading__logo {
  width: 49px;
  height: 49px;
  object-fit: contain;
}

.invify-loading__message {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-align: center;
}

@keyframes invify-pulse {
  from { transform: scale(0.85); }
  to { transform: scale(1.05); }
}

@keyframes invify-spin {
  to { transform: rotate(360deg); }
}
</style>
