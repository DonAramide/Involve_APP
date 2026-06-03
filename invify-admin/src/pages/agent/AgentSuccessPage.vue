<template>
  <q-page class="flex flex-center bg-main text-main font-inter">
    <div class="panel-card bg-panel border-muted rounded-borders q-pa-xl column items-center text-center op-gap-24" style="width: 100%; max-width: 500px;">
      
      <!-- Success Icon with Pulse Rings -->
      <div class="success-icon-wrapper q-mb-md">
        <div class="pulse-ring ring-1"></div>
        <div class="pulse-ring ring-2"></div>
        <div class="success-icon bg-cyan-9 text-cyan-3 flex flex-center">
          <q-icon name="check" size="4rem" />
        </div>
      </div>

      <div class="column op-gap-8">
        <div class="text-operator-title text-weight-bold text-cyan-3" style="font-size: 24px; letter-spacing: 0.5px;">
          Submission Received!
        </div>
        <div class="text-caption text-grey-4 text-weight-medium font-mono q-px-md">
          Your verification details have been securely uploaded to our storage array.
        </div>
      </div>

      <q-separator dark class="full-width opacity-10" />

      <div class="text-caption text-muted font-sans q-px-sm leading-relaxed" style="font-size: 13px;">
        Thank you for helping us keep the Invify agent network secure. Our compliance officers and automated audit processes are currently reviewing your documents. We will get back to you shortly, and you will receive a notification as soon as your account status is updated.
      </div>

      <q-btn 
        color="cyan-3" 
        text-color="black" 
        label="Return to Login" 
        class="text-weight-bold q-px-xl q-py-sm text-subtitle2" 
        to="/agent/login" 
        no-caps
      />
      
    </div>
  </q-page>
</template>

<script setup>
// Pure success presentation page
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }

/* Success Animation */
.success-icon-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
}

.success-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  position: relative;
  z-index: 2;
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.2);
  animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.pulse-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--q-cyan-3, #00e5ff);
  opacity: 0;
  z-index: 1;
}

.ring-1 {
  animation: pulse 2s infinite ease-out;
}
.ring-2 {
  animation: pulse 2s infinite ease-out 0.6s;
}

@keyframes scaleIn {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.5); opacity: 0; }
}

.leading-relaxed {
  line-height: 1.6;
}
</style>
