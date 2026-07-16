import { defineStore } from 'pinia';
import { InventoryRepository, ItemDTO, CategoryDTO, SupplierDTO, StockSummaryDTO } from '../repositories/inventory.repository';
import { useEventBus } from '../services/realtime';
import { EnterpriseEventV1 } from '../domains/core/events/enterprise.event';

// ViewModels decoupled from Database Entities
export interface ProductViewModel {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
  minQuantity: number;
  price: number;
  status: string;
  categoryId: string | null;
  supplierId: string | null;
}

export interface CategoryViewModel {
  id: string;
  name: string;
  isActive: boolean;
}

export interface SupplierViewModel {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  status: string;
}

export interface InventoryState {
  products: ProductViewModel[];
  categories: CategoryViewModel[];
  suppliers: SupplierViewModel[];
  stockSummary: StockSummaryDTO | null;
  isLoading: boolean;
  error: string | null;
  unsubscribeFn: (() => void) | null;
}

export const useInventoryStore = defineStore('inventory', {
  state: (): InventoryState => ({
    products: [],
    categories: [],
    suppliers: [],
    stockSummary: null,
    isLoading: false,
    error: null,
    unsubscribeFn: null
  }),

  getters: {
    lowStockProducts: (state) => state.products.filter(p => p.quantity <= p.minQuantity && p.quantity > 0),
    outOfStockProducts: (state) => state.products.filter(p => p.quantity <= 0),
    activeSuppliers: (state) => state.suppliers.filter(s => s.status === 'active')
  },

  actions: {
    // ----------------------------------------------------
    // REALTIME LIFECYCLE
    // ----------------------------------------------------
    hydrate() {
      this.fetchProducts();
      this.fetchCategories();
      this.fetchSuppliers();
      this.fetchStockSummary();
      this.subscribe();
    },

    subscribe() {
      if (this.unsubscribeFn) return;
      const bus = useEventBus();
      this.unsubscribeFn = bus.subscribe('inventory.*', (event: EnterpriseEventV1) => {
        this.refresh(event);
      });
    },

    unsubscribe() {
      if (this.unsubscribeFn) {
        this.unsubscribeFn();
        this.unsubscribeFn = null;
      }
    },

    refresh(event: EnterpriseEventV1) {
      if (event.event === 'inventory.stock.changed') {
        const product = this.products.find(p => p.id === event.payload.productId);
        if (product) {
          product.quantity = event.payload.currentStock;
        }
      } else {
        this.invalidate(event.event);
      }
    },

    invalidate(topic: string) {
      console.log(`[InventoryStore] Invalidating data due to ${topic}`);
      if (topic.includes('product')) this.fetchProducts();
      if (topic.includes('category')) this.fetchCategories();
      if (topic.includes('supplier')) this.fetchSuppliers();
      this.fetchStockSummary();
    },

    // ----------------------------------------------------
    // MAPPERS (DTO -> ViewModel)
    // ----------------------------------------------------
    mapItemToProduct(dto: ItemDTO): ProductViewModel {
      return {
        id: dto.id,
        name: dto.name,
        sku: dto.sku || '',
        barcode: dto.barcode || '',
        quantity: dto.stock_qty,
        minQuantity: dto.min_stock_qty,
        price: dto.price || 0,
        status: dto.status || 'active',
        categoryId: dto.category_id || null,
        supplierId: dto.supplier_id || null
      };
    },

    mapCategory(dto: CategoryDTO): CategoryViewModel {
      return {
        id: dto.id,
        name: dto.name,
        isActive: dto.is_active
      };
    },

    mapSupplier(dto: SupplierDTO): SupplierViewModel {
      return {
        id: dto.id,
        name: dto.name,
        contact: dto.contact_name || '',
        phone: dto.phone || '',
        email: dto.email || '',
        status: dto.status
      };
    },

    // ----------------------------------------------------
    // ACTIONS
    // ----------------------------------------------------
    async fetchProducts(query: string = '') {
      this.isLoading = true;
      this.error = null;
      try {
        const dtos = await InventoryRepository.searchProducts(query);
        this.products = dtos.map(this.mapItemToProduct);
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch products';
      } finally {
        this.isLoading = false;
      }
    },

    async fetchCategories() {
      this.isLoading = true;
      try {
        const dtos = await InventoryRepository.getCategories();
        this.categories = dtos.map(this.mapCategory);
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSuppliers() {
      this.isLoading = true;
      try {
        const dtos = await InventoryRepository.getSuppliers();
        this.suppliers = dtos.map(this.mapSupplier);
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchStockSummary() {
      this.isLoading = true;
      try {
        this.stockSummary = await InventoryRepository.getStockSummary();
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.isLoading = false;
      }
    },

    async createProduct(payload: Partial<ItemDTO>) {
      this.isLoading = true;
      try {
        const dto = await InventoryRepository.createProduct(payload);
        this.products.unshift(this.mapItemToProduct(dto));
      } catch (err: any) {
        this.error = err.message;
        throw err;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
