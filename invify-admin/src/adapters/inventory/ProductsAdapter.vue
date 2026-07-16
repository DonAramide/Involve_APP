<template>
  <div class="products-adapter q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <h5 class="q-ma-none text-weight-bold">Products Inventory</h5>
      <q-btn color="primary" icon="add" label="Add Product" @click="showAddDialog = true" unelevated />
    </div>

    <!-- Analytics Cards -->
    <div class="row q-col-gutter-md q-mb-lg" v-if="stockSummary">
      <div class="col-12 col-md-3">
        <q-card class="bg-primary text-white" flat bordered>
          <q-card-section>
            <div class="text-h6">{{ stockSummary.total_items }}</div>
            <div class="text-subtitle2">Total Stock Items</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="bg-warning text-white" flat bordered>
          <q-card-section>
            <div class="text-h6">{{ stockSummary.low_stock_items }}</div>
            <div class="text-subtitle2">Low Stock Alerts</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="bg-negative text-white" flat bordered>
          <q-card-section>
            <div class="text-h6">{{ stockSummary.out_of_stock_items }}</div>
            <div class="text-subtitle2">Out of Stock</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="bg-positive text-white" flat bordered>
          <q-card-section>
            <div class="text-h6">₦{{ stockSummary.total_value.toLocaleString() }}</div>
            <div class="text-subtitle2">Inventory Value</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Data Table -->
    <q-table
      flat
      bordered
      :rows="products"
      :columns="columns"
      row-key="id"
      :loading="isLoading"
      :filter="filter"
    >
      <template v-slot:top-right>
        <q-input borderless dense debounce="300" v-model="filter" placeholder="Search">
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip :color="props.row.quantity > props.row.minQuantity ? 'positive' : (props.row.quantity === 0 ? 'negative' : 'warning')" text-color="white" size="sm">
            {{ props.row.quantity > props.row.minQuantity ? 'In Stock' : (props.row.quantity === 0 ? 'Out of Stock' : 'Low Stock') }}
          </q-chip>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useInventoryStore } from '../../stores/inventory.store';

const store = useInventoryStore();
const filter = ref('');
const showAddDialog = ref(false);

const columns = [
  { name: 'name', label: 'Product Name', align: 'left', field: 'name', sortable: true },
  { name: 'sku', label: 'SKU', align: 'left', field: 'sku', sortable: true },
  { name: 'quantity', label: 'Stock Qty', align: 'right', field: 'quantity', sortable: true },
  { name: 'price', label: 'Unit Price', align: 'right', field: 'price', sortable: true, format: (val: number) => `₦${val.toLocaleString()}` },
  { name: 'status', label: 'Status', align: 'center', field: 'status' }
];

const products = computed(() => store.products);
const stockSummary = computed(() => store.stockSummary);
const isLoading = computed(() => store.isLoading);

onMounted(() => {
  store.fetchProducts();
  store.fetchStockSummary();
});
</script>
