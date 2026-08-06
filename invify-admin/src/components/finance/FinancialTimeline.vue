<template>
  <div class="financial-timeline">
    <div 
      v-for="(step, index) in steps" 
      :key="index"
      class="timeline-step"
      :class="{ 'is-completed': step.completed, 'is-active': step.active, 'is-failed': step.failed }"
    >
      <div class="timeline-indicator">
        <i v-if="step.completed" class="fas fa-check"></i>
        <i v-else-if="step.failed" class="fas fa-times"></i>
        <span v-else class="timeline-dot"></span>
      </div>
      <div class="timeline-content">
        <div class="timeline-title">{{ step.title }}</div>
        <div v-if="step.description" class="timeline-desc">{{ step.description }}</div>
        <div v-if="step.timestamp" class="timeline-time">{{ formatTime(step.timestamp) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  steps: {
    type: Array,
    required: true,
    // Expects array of { title, description, timestamp, completed, active, failed }
  }
});

const formatTime = (ts) => {
  return new Date(ts).toLocaleString();
};
</script>

<style scoped>
.financial-timeline {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 20px;
}
.financial-timeline::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 31px; /* Center of the indicator */
  width: 2px;
  background-color: #e5e7eb;
}

.timeline-step {
  display: flex;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.timeline-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f3f4f6;
  border: 2px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: white;
  font-size: 10px;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
}

.is-completed .timeline-indicator {
  background: #10b981;
  border-color: #10b981;
}

.is-active .timeline-indicator {
  border-color: #3b82f6;
}
.is-active .timeline-dot {
  background: #3b82f6;
}

.is-failed .timeline-indicator {
  background: #ef4444;
  border-color: #ef4444;
}

.timeline-content {
  flex: 1;
}

.timeline-title {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
}

.timeline-desc {
  font-size: 13px;
  color: #4b5563;
  margin-top: 4px;
}

.timeline-time {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}
</style>
