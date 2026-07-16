<template>
  <div class="suppliers-adapter q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <h5 class="q-ma-none text-weight-bold">Suppliers</h5>
      <q-btn color="primary" icon="add" label="Add Supplier" unelevated />
    </div>

    <q-table
      flat
      bordered
      :rows="suppliers"
      :columns="columns"
      row-key="id"
      :loading="isLoading"
    >
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip :color="props.row.status === 'active' ? 'positive' : 'grey'" text-color="white" size="sm">
            {{ props.row.status }}
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
  { name: 'name', label: 'Company Name', align: 'left', field: 'name', sortable: true },
  { name: 'contact', label: 'Contact Person', align: 'left', field: 'contact' },
  { name: 'phone', label: 'Phone', align: 'left', field: 'phone' },
  { name: 'email', label: 'Email', align: 'left', field: 'email' },
  { name: 'status', label: 'Status', align: 'center', field: 'status' }
];

const suppliers = computed(() => store.suppliers);
const isLoading = computed(() => store.isLoading);

onMounted(() => {
  store.fetchSuppliers();
});
</script>
