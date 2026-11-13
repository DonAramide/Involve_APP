import { defineStore } from 'pinia';
import { InventoryRepository, ItemDTO, CategoryDTO, SupplierDTO, StockSummaryDTO } from '../repositories/inventory.repository';
import { schoolApi } from '../api/index';
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
        quantity: Number(dto.stock_qty ?? 0),
        minQuantity: Number(dto.min_stock_qty ?? 0),
        price: Number(dto.price || 0),
        status: String(dto.status || 'active').toUpperCase(),
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
        let dtos = await InventoryRepository.searchProducts(query);
        // School fee items often only appear via /api/school/billing until a full inventory sync.
        if (!dtos.length) {
          try {
            const { data } = await schoolApi.getBilling();
            const fees = Array.isArray(data?.fees) ? data.fees : [];
            const q = String(query || '').trim().toLowerCase();
            dtos = fees
              .filter((f: any) => !q || String(f.name || '').toLowerCase().includes(q))
              .map((f: any) => ({
                id: String(f.id || f.sync_id || f.syncId || ''),
                name: String(f.name || 'Fee item'),
                sku: f.sku || '',
                barcode: f.barcode || '',
                stock_qty: Number(f.stock_qty ?? f.stockQty ?? 0),
                min_stock_qty: Number(f.min_stock_qty ?? f.minStockQty ?? 0),
                price: Number(f.price ?? 0),
                status: f.status || 'active',
                type: f.type || 'service',
                category_id: f.category_id || f.categoryId || undefined,
                supplier_id: f.supplier_id || f.supplierId || undefined,
              }));
          } catch (_) {
            /* school billing optional */
          }
        }
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
    },

    async updateProduct(id: string, payload: Partial<ItemDTO>) {
      this.isLoading = true;
      this.error = null;
      try {
        const dto = await InventoryRepository.updateProduct(id, payload);
        const mapped = this.mapItemToProduct(dto);
        const idx = this.products.findIndex((p) => p.id === id);
        if (idx >= 0) this.products[idx] = mapped;
        else this.products.unshift(mapped);
        return mapped;
      } catch (err: any) {
        this.error = err?.response?.data?.error || err.message || 'Failed to update product';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async setStockQuantity(id: string, nextQty: number, notes?: string) {
      const current = this.products.find((p) => p.id === id);
      const currentQty = Number(current?.quantity ?? 0);
      const target = Math.max(0, Number(nextQty) || 0);
      const delta = target - currentQty;
      if (delta > 0) {
        await InventoryRepository.addStock(id, delta, notes || 'Web stock adjustment');
      }
      // Always persist absolute price/stock fields via update.
      return this.updateProduct(id, {
        stock_qty: target,
        min_stock_qty: current?.minQuantity,
        price: current?.price,
        name: current?.name,
        status: current?.status?.toLowerCase(),
      } as Partial<ItemDTO>);
    }
  }
});
