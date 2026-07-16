<template>
  <div class="stock-adapter q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <h5 class="q-ma-none text-weight-bold">Stock Adjustments</h5>
      <q-btn color="primary" icon="inventory_2" label="Receive Stock" unelevated />
    </div>

    <q-table
      flat
      bordered
      title="Low & Out of Stock"
      :rows="criticalStock"
      :columns="columns"
      row-key="id"
      :loading="isLoading"
    >
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip :color="props.row.quantity === 0 ? 'negative' : 'warning'" text-color="white" size="sm">
            {{ props.row.quantity === 0 ? 'Out of Stock' : 'Low Stock' }}
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
  { name: 'name', label: 'Product Name', align: 'left', field: 'name', sortable: true },
  { name: 'sku', label: 'SKU', align: 'left', field: 'sku', sortable: true },
  { name: 'quantity', label: 'Current Qty', align: 'right', field: 'quantity', sortable: true },
  { name: 'minQuantity', label: 'Min Qty', align: 'right', field: 'minQuantity', sortable: true },
  { name: 'status', label: 'Status', align: 'center', field: 'status' }
];

const criticalStock = computed(() => {
  return [...store.outOfStockProducts, ...store.lowStockProducts];
});

const isLoading = computed(() => store.isLoading);

onMounted(() => {
  store.fetchProducts(); // We need all products to compute critical stock
});
</script>
