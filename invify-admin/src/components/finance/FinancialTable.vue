<template>
  <div class="financial-table-wrapper">
    <!-- Optional Bulk Actions Bar -->
    <div v-if="selectedRows.length > 0" class="bulk-actions-bar">
      <span class="selected-count">{{ selectedRows.length }} selected</span>
      <div class="actions">
        <slot name="bulk-actions"></slot>
      </div>
    </div>

    <table class="financial-table">
      <thead>
        <tr>
          <th v-if="selectable" class="col-checkbox">
            <input type="checkbox" @change="toggleAll" :checked="isAllSelected" />
          </th>
          <th v-for="col in columns" :key="col.key" :class="[`align-${col.align || 'left'}`]">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="data.length === 0" class="empty-row">
          <td :colspan="selectable ? columns.length + 1 : columns.length" class="empty-state-cell">
            <slot name="empty">No data available.</slot>
          </td>
        </tr>
        <tr 
          v-for="row in data" 
          :key="row.id" 
          @click="$emit('row-click', row)"
          class="data-row"
        >
          <td v-if="selectable" class="col-checkbox" @click.stop>
            <input type="checkbox" :value="row.id" v-model="selectedRows" />
          </td>
          <td v-for="col in columns" :key="col.key" :class="[`align-${col.align || 'left'}`]">
            <slot :name="`cell-${col.key}`" :row="row">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  columns: {
    type: Array,
    required: true // { key, label, align: 'left' | 'right' | 'center' }
  },
  data: {
    type: Array,
    default: () => []
  },
  selectable: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['row-click', 'selection-change']);

const selectedRows = ref([]);

const isAllSelected = computed(() => {
  return props.data.length > 0 && selectedRows.value.length === props.data.length;
});

const toggleAll = (e) => {
  if (e.target.checked) {
    selectedRows.value = props.data.map(row => row.id);
  } else {
    selectedRows.value = [];
  }
  emit('selection-change', selectedRows.value);
};

// Expose selection change logic if individual checkboxes change
// Note: We could use a watcher on selectedRows to emit selection-change
</script>

<style scoped>
.financial-table-wrapper {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  position: relative;
}

.bulk-actions-bar {
  background: #f3f4f6;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.selected-count {
  font-weight: 600;
  color: #3b82f6;
  font-size: 14px;
}

.financial-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.financial-table th {
  background: #f9fafb;
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.financial-table td {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  color: #111827;
  font-size: 14px;
}

.data-row {
  cursor: pointer;
  transition: background-color 0.15s;
}

.data-row:hover {
  background-color: #f9fafb;
}

.data-row:last-child td {
  border-bottom: none;
}

.col-checkbox {
  width: 48px;
  text-align: center;
}

.align-left { text-align: left; }
.align-center { text-align: center; }
.align-right { text-align: right; }

.empty-row td {
  text-align: center;
  padding: 48px;
  color: #6b7280;
}
</style>
