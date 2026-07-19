<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <!-- Top Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="inventory_2" color="cyan-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Inventory Stock Matrix</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Manage product catalog, real-time stock levels, and supply chains.
        </div>
      </div>
      <div>
        <q-btn 
          unelevated 
          color="cyan-9" 
          text-color="black" 
          icon="add_box" 
          label="Add Product"
          @click="showAddDialog = true" 
          class="text-weight-bold text-caption text-black"
        />
      </div>
    </div>

    <!-- Metrics Bar -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-3">
        <q-card class="bg-card-dark border-grey-9 q-pa-md">
          <div class="text-caption text-grey-5 text-uppercase">Total Products</div>
          <div class="text-h4 text-weight-bold text-white q-mt-xs font-mono">{{ inventoryStore.products.length }}</div>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="bg-card-dark border-grey-9 q-pa-md">
          <div class="text-caption text-grey-5 text-uppercase">Low Stock Alerts</div>
          <div class="text-h4 text-weight-bold text-orange-4 q-mt-xs font-mono">{{ inventoryStore.lowStockProducts.length }}</div>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="bg-card-dark border-grey-9 q-pa-md">
          <div class="text-caption text-grey-5 text-uppercase">Out of Stock</div>
          <div class="text-h4 text-weight-bold text-red-4 q-mt-xs font-mono">{{ inventoryStore.outOfStockProducts.length }}</div>
        </q-card>
      </div>
    </div>

    <!-- Data Grid -->
    <q-card class="bg-card-dark border-grey-9 q-pa-lg">
      <q-table
        :rows="inventoryStore.products"
        :columns="columns"
        row-key="id"
        dark
        flat
        bordered
        class="bg-card-dark"
        :loading="inventoryStore.isLoading"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip 
              :color="props.value === 'ACTIVE' ? 'green-10' : 'grey-9'"
              :text-color="props.value === 'ACTIVE' ? 'green-3' : 'grey-4'"
              size="sm"
              class="font-mono text-weight-bold"
            >
              {{ props.value }}
            </q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-quantity="props">
          <q-td :props="props">
            <span :class="{'text-red-4 text-weight-bold': props.row.quantity <= 0, 'text-orange-4': props.row.quantity > 0 && props.row.quantity <= props.row.minQuantity}">
              {{ props.value }}
            </span>
          </q-td>
        </template>
        <template v-slot:body-cell-price="props">
          <q-td :props="props" class="font-mono">
            ₦{{ props.value.toLocaleString() }}
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat round color="cyan-4" icon="edit" size="sm">
              <q-tooltip class="bg-black text-cyan-4 border-cyan font-mono">EDIT PRODUCT</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useInventoryStore } from '../../../../stores/inventory.store'

const inventoryStore = useInventoryStore()
const showAddDialog = ref(false)

const columns = [
  { name: 'sku', label: 'SKU', align: 'left', field: 'sku', sortable: true, classes: 'font-mono text-grey-4' },
  { name: 'name', label: 'PRODUCT NAME', align: 'left', field: 'name', sortable: true },
  { name: 'category', label: 'CATEGORY', align: 'left', field: row => getCategoryName(row.categoryId), sortable: true },
  { name: 'quantity', label: 'STOCK', align: 'center', field: 'quantity', sortable: true },
  { name: 'price', label: 'PRICE', align: 'right', field: 'price', sortable: true },
  { name: 'status', label: 'STATUS', align: 'left', field: 'status', sortable: true },
  { name: 'actions', label: 'ACTIONS', align: 'right' }
]

const getCategoryName = (id) => {
  const cat = inventoryStore.categories.find(c => c.id === id)
  return cat ? cat.name : 'Uncategorized'
}

onMounted(() => {
  inventoryStore.hydrate()
})

onUnmounted(() => {
  inventoryStore.unsubscribe()
})
</script>

<style scoped>
.bg-card-dark {
  background: rgba(255, 255, 255, 0.02);
}
.border-grey-9 {
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
