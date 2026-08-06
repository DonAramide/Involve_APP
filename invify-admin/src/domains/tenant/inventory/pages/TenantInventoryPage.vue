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
        :pagination="{ rowsPerPage: 30 }"
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
            <q-btn flat round color="green-4" icon="history" size="sm" @click="viewStockHistory(props.row)" class="q-ml-xs">
              <q-tooltip class="bg-black text-green-4 border-green font-mono">STOCK HISTORY</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Stock History Dialog -->
    <q-dialog v-model="showHistoryDialog">
      <q-card class="bg-card-dark border-grey-9 text-white" style="width: 550px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">Stock & Purchase History: {{ selectedProduct?.name }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div v-if="isLoadingHistory" class="row justify-center q-py-xl items-center">
            <q-spinner color="cyan-4" size="md" />
            <span class="text-caption text-grey-5 q-ml-sm">Fetching real-time purchase & stock ledger...</span>
          </div>
          <div v-else-if="!mockHistory.length" class="text-center text-grey-6 q-py-xl italic">
            No stock movements or purchases recorded for this product.
          </div>
          <q-timeline v-else color="cyan-4" dark class="q-px-md">
            <q-timeline-entry
              v-for="log in mockHistory"
              :key="log.date + log.note"
              :title="log.type"
              :subtitle="log.date"
              :color="log.type === 'RESTOCK' ? 'green-4' : (log.type === 'SALE' ? 'orange-4' : 'blue-4')"
            >
              <div class="row items-center justify-between">
                <div class="text-grey-3">{{ log.note }}</div>
                <div class="font-mono text-weight-bold" :class="log.change > 0 ? 'text-green-4' : 'text-orange-4'">
                  {{ log.change > 0 ? '+' : '' }}{{ log.change }}
                </div>
              </div>
              <div class="text-caption text-grey-5 q-mt-xs">Resulting Stock: {{ log.stock }} units</div>
            </q-timeline-entry>
          </q-timeline>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useInventoryStore } from '../../../../stores/inventory.store'
import { InventoryRepository } from '../../../../repositories/inventory.repository'

const inventoryStore = useInventoryStore()
const showAddDialog = ref(false)
const showHistoryDialog = ref(false)
const isLoadingHistory = ref(false)
const selectedProduct = ref(null)
const mockHistory = ref([])

const columns = [
  { name: 'sku', label: 'SKU', align: 'left', field: 'sku', sortable: true, classes: 'font-mono text-grey-4' },
  { name: 'name', label: 'PRODUCT NAME', align: 'left', field: 'name', sortable: true },
  { name: 'category', label: 'CATEGORY', align: 'left', field: row => getCategoryName(row.categoryId, row), sortable: true },
  { name: 'quantity', label: 'STOCK', align: 'center', field: 'quantity', sortable: true },
  { name: 'price', label: 'PRICE', align: 'right', field: 'price', sortable: true },
  { name: 'status', label: 'STATUS', align: 'left', field: 'status', sortable: true },
  { name: 'actions', label: 'ACTIONS', align: 'right' }
]

const getCategoryName = (id, row) => {
  const cat = inventoryStore.categories.find(c => c.id === id)
  if (cat) return cat.name
  
  // Intelligent retail fallback
  const name = (row?.name || '').toLowerCase()
  if (name.includes('rice') || name.includes('beans') || name.includes('food')) {
    return 'Grains & Food'
  }
  if (name.includes('book') || name.includes('fee') || name.includes('tuition')) {
    return 'Education'
  }
  return 'General Store'
}

const viewStockHistory = async (product) => {
  selectedProduct.value = product
  isLoadingHistory.value = true
  showHistoryDialog.value = true
  mockHistory.value = []

  try {
    const history = await InventoryRepository.getStockHistory(product.id)
    const list = []

    // Process Sales (purchase records)
    if (history.sales) {
      history.sales.forEach(sale => {
        list.push({
          date: formatDateTime(sale.created_at),
          timestamp: new Date(sale.created_at).getTime(),
          type: 'SALE',
          change: -Number(sale.quantity || 0),
          note: `POS Transaction ${sale.invoice_number || 'Unknown'} (Customer: ${sale.customer_name || 'Unknown'})`
        })
      })
    }

    // Process Increments (Restocks)
    if (history.increments) {
      history.increments.forEach(inc => {
        list.push({
          date: formatDateTime(inc.created_at),
          timestamp: new Date(inc.created_at).getTime(),
          type: 'RESTOCK',
          change: Number(inc.quantity || 0),
          note: inc.notes || 'Manual supplier stock replenishment'
        })
      })
    }

    // Process Returns
    if (history.returns) {
      history.returns.forEach(ret => {
        list.push({
          date: formatDateTime(ret.created_at),
          timestamp: new Date(ret.created_at).getTime(),
          type: 'RETURN',
          change: Number(ret.quantity || 0),
          note: ret.reason || 'Customer stock return'
        })
      })
    }

    // Sort all records ascending by timestamp to calculate rolling balance
    list.sort((a, b) => a.timestamp - b.timestamp)

    let tempStock = product.quantity - list.reduce((sum, item) => sum + item.change, 0)
    list.forEach(item => {
      tempStock += item.change
      item.stock = tempStock
    })

    // Reverse to show newest first
    mockHistory.value = list.reverse()
  } catch (err) {
    console.error('Error loading stock history:', err)
  } finally {
    isLoadingHistory.value = false
  }
}

const formatDateTime = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const yr = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const hr = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yr}-${mo}-${da} ${hr}:${mi}`
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
