<template>
  <div class="categories-adapter q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <h5 class="q-ma-none text-weight-bold">Product Categories</h5>
      <q-btn color="primary" icon="add" label="New Category" unelevated />
    </div>

    <q-table
      flat
      bordered
      :rows="categories"
      :columns="columns"
      row-key="id"
      :loading="isLoading"
    >
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip :color="props.row.isActive ? 'positive' : 'grey'" text-color="white" size="sm">
            {{ props.row.isActive ? 'Active' : 'Inactive' }}
          </q-chip>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useInventoryStore } from '../../stores/inventory.store';

const store = useInventoryStore();

const columns = [
  { name: 'name', label: 'Category Name', align: 'left', field: 'name', sortable: true },
  { name: 'status', label: 'Status', align: 'center', field: 'isActive' }
];

const categories = computed(() => store.categories);
const isLoading = computed(() => store.isLoading);

onMounted(() => {
  store.fetchCategories();
});
</script>
