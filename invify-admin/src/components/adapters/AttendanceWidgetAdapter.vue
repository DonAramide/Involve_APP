<template>
  <q-card class="bg-card-dark border-grey-9 relative-position column h-full" style="min-height: 140px;">
    <!-- Loading State -->
    <q-inner-loading :showing="status === 'loading'" class="bg-black-transparent">
      <q-spinner-dots size="40px" color="cyan-4" />
    </q-inner-loading>

    <!-- Error State -->
    <div v-if="status === 'error'" class="flex flex-center h-full q-pa-md text-center">
      <div>
        <q-icon name="error_outline" color="red-4" size="md" />
        <div class="text-caption text-red-4 q-mt-xs">{{ errorMessage }}</div>
        <q-btn flat dense size="sm" color="grey-5" label="Retry" class="q-mt-sm" @click="fetchData(true)" />
      </div>
    </div>

    <!-- Empty State / Not Implemented -->
    <div v-else-if="status === 'empty' || status === 'success'" class="flex flex-center h-full q-pa-md text-center">
      <div>
        <q-icon name="construction" color="amber-6" size="md" />
        <div class="text-caption text-amber-5 q-mt-xs text-weight-bold">NOT IMPLEMENTED</div>
        <div class="text-caption text-grey-5 q-mt-xs" style="font-size: 10px;">Attendance backend module is pending</div>
      </div>
    </div>
  </q-card>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRuntimeStore } from '../../stores/runtime.store';
import { AttendanceRepository } from '../../repositories/AttendanceRepository';

const store = useRuntimeStore();

const status = ref('loading');
const errorMessage = ref('');
const data = ref(null);
const isCached = ref(false);
const isRealtime = ref(true);
let realtimeSub = null;

const fetchData = async (forceRefresh = false) => {
  try {
    status.value = 'loading';
    isCached.value = !forceRefresh;
    
    const result = await AttendanceRepository.getAttendance(store.tenantId, { refresh: forceRefresh });
    
    if (!result || result.total === 0) {
      status.value = 'empty';
    } else {
      data.value = result;
      status.value = 'success';
    }
  } catch (err) {
    errorMessage.value = err.message || 'Failed to fetch attendance';
    status.value = 'error';
  }
};

onMounted(() => {
  fetchData();
});

onBeforeUnmount(() => {
  if (realtimeSub) clearInterval(realtimeSub);
});
</script>

<style scoped>
.h-full { height: 100%; }
.bg-black-transparent { background: rgba(0, 0, 0, 0.7); }
</style>
